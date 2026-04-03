import { env } from '../config/env.js'
import type { ParcelMetrics } from '../utils/parcelMetrics.js'

interface MiCorreoTokenResponse {
  token: string
  expires: string | null
}

interface MiCorreoRatePayload {
  deliveredType?: unknown
  productType?: unknown
  productName?: unknown
  price?: unknown
  deliveryTimeMin?: unknown
  deliveryTimeMax?: unknown
}

interface MiCorreoRateResponse {
  validTo: string | null
  rates: MiCorreoRatePayload[]
}

export interface NormalizedMiCorreoRate {
  id: string
  deliveredType: string
  productType: string
  productName: string
  price: number
  deliveryTimeMin: string
  deliveryTimeMax: string
}

export interface MiCorreoRateSelection {
  rateId?: string | null
  deliveredType?: string | null
  productType?: string | null
  productName?: string | null
}

let tokenCache: { token: string; expiresAt: number } | null = null
const DEFAULT_TIMEOUT_MS = 10_000

function trimText(value: unknown): string {
  return String(value ?? '').trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseIsoDateMs(value: string | null | undefined): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function parseTokenPayload(payload: unknown): MiCorreoTokenResponse | null {
  if (!isRecord(payload)) return null
  const token = trimText(payload.token)
  if (!token) return null
  const expires = trimText(payload.expires)
  return {
    token,
    expires: expires || null,
  }
}

function parseRateResponsePayload(payload: unknown): MiCorreoRateResponse | null {
  if (!isRecord(payload) || !Array.isArray(payload.rates)) return null
  const validTo = trimText(payload.validTo)
  return {
    validTo: validTo || null,
    rates: payload.rates,
  }
}

function normalizePrice(value: unknown): number | null {
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) return null
  return Math.round(price * 100) / 100
}

function buildLegacyRateKey(rate: MiCorreoRateSelection): string {
  return [
    trimText(rate.deliveredType).toUpperCase(),
    trimText(rate.productType).toUpperCase(),
    trimText(rate.productName).toUpperCase(),
  ].join('|')
}

function hasLegacyRateSelection(rate?: MiCorreoRateSelection | null): boolean {
  if (!rate) return false
  return Boolean(
    trimText(rate.deliveredType) || trimText(rate.productType) || trimText(rate.productName),
  )
}

export function buildRateId(rate: {
  deliveredType: string
  productType: string
  price: number
}): string {
  return [
    trimText(rate.deliveredType).toUpperCase(),
    trimText(rate.productType).toUpperCase(),
    rate.price.toFixed(2),
  ].join('-')
}

function normalizeRate(raw: MiCorreoRatePayload): NormalizedMiCorreoRate | null {
  const productType = trimText(raw.productType).toUpperCase()
  const deliveredType = trimText(raw.deliveredType).toUpperCase()
  const price = normalizePrice(raw.price)
  const productName = trimText(raw.productName) || `Correo Argentino ${productType || 'Standard'}`

  if (!productType || !deliveredType || price == null) {
    return null
  }

  return {
    id: buildRateId({ deliveredType, productType, price }),
    deliveredType,
    productType,
    productName,
    price,
    deliveryTimeMin: trimText(raw.deliveryTimeMin),
    deliveryTimeMax: trimText(raw.deliveryTimeMax),
  }
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  if (!text) return `HTTP ${response.status}`
  try {
    const parsed = JSON.parse(text) as unknown
    if (isRecord(parsed)) {
      const message = trimText(parsed.message)
      const code = trimText(parsed.code)
      if (message) return message
      if (code) return code
    }
  } catch {
    /* texto plano */
  }
  return text.slice(0, 240)
}

async function safeFetch(
  input: string,
  init: RequestInit,
  context: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    const e = error as { name?: string; message?: string }
    const message =
      e.name === 'AbortError'
        ? `timeout después de ${timeoutMs}ms`
        : trimText(e.message) || 'error de red desconocido'
    console.error(`[MiCorreo] ${context}: ${message}`)
    throw new Error(message)
  } finally {
    clearTimeout(timeoutId)
  }
}

export function findMiCorreoRateById(
  rates: NormalizedMiCorreoRate[],
  rateId?: string | null,
): NormalizedMiCorreoRate | null {
  const normalizedId = trimText(rateId)
  if (!normalizedId) return null
  return rates.find((rate) => rate.id === normalizedId) ?? null
}

function isValidParcel(parcel: ParcelMetrics): boolean {
  const values = [parcel.weightG, parcel.heightCm, parcel.widthCm, parcel.lengthCm]
  if (values.some((value) => !Number.isFinite(value))) return false
  return (
    parcel.weightG > 0 &&
    parcel.weightG <= 25_000 &&
    parcel.heightCm > 0 &&
    parcel.heightCm <= 150 &&
    parcel.widthCm > 0 &&
    parcel.widthCm <= 150 &&
    parcel.lengthCm > 0 &&
    parcel.lengthCm <= 150
  )
}

export function buildMiCorreoRateKey(rate: MiCorreoRateSelection): string {
  return buildLegacyRateKey(rate)
}

export function selectMiCorreoRate(
  rates: NormalizedMiCorreoRate[],
  preferred?: MiCorreoRateSelection | null,
): NormalizedMiCorreoRate | null {
  if (rates.length === 0) return null
  const normalized = [...rates].sort((a, b) => a.price - b.price)
  const exactById = findMiCorreoRateById(normalized, preferred?.rateId)
  if (exactById) return exactById

  if (hasLegacyRateSelection(preferred)) {
    const preferredKey = buildLegacyRateKey(preferred!)
    const matched = normalized.find((rate) => buildLegacyRateKey(rate) === preferredKey)
    return matched ?? null
  }

  return normalized[0] ?? null
}

async function getBearerToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.token
  }

  const basic = Buffer.from(`${env.miCorreoApiUser}:${env.miCorreoApiPassword}`).toString('base64')
  const response = await safeFetch(
    `${env.miCorreoApiBaseUrl}/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
      },
    },
    'error obteniendo token',
  )

  if (!response.ok) {
    const detail = await parseError(response)
    console.error(`[MiCorreo] error obteniendo token: HTTP ${response.status} - ${detail}`)
    if (response.status === 401) {
      throw new Error('credenciales inválidas al autenticar con MiCorreo')
    }
    throw new Error(`falló autenticación con MiCorreo (${response.status}): ${detail}`)
  }

  const rawPayload = (await response.json().catch(() => null)) as unknown
  const payload = parseTokenPayload(rawPayload)
  if (!payload) {
    console.error('[MiCorreo] error obteniendo token: respuesta JSON inválida')
    throw new Error('MiCorreo devolvió un token inválido')
  }

  const expiresAt = parseIsoDateMs(payload.expires) ?? now + 10 * 60_000
  tokenCache = { token: payload.token, expiresAt }
  return payload.token
}

export function isMiCorreoConfigured(): boolean {
  return Boolean(
    env.miCorreoApiBaseUrl &&
      env.miCorreoApiUser &&
      env.miCorreoApiPassword &&
      env.miCorreoCustomerId &&
      env.miCorreoPostalCodeOrigin,
  )
}

export async function quoteMiCorreoRates(params: {
  destinationPostalCode: string
  parcel: ParcelMetrics
  deliveredType?: 'D' | 'S'
}): Promise<{ validTo: string | null; rates: NormalizedMiCorreoRate[] }> {
  if (!isMiCorreoConfigured()) {
    throw new Error('Faltan credenciales de MiCorreo para cotizar')
  }

  if (!isValidParcel(params.parcel)) {
    throw new Error('El paquete tiene peso o dimensiones inválidas para cotizar en MiCorreo')
  }

  const destinationPostalCode = trimText(params.destinationPostalCode).toUpperCase().replace(/\s+/g, '')
  if (!destinationPostalCode) {
    throw new Error('Falta el código postal de destino para cotizar en MiCorreo')
  }

  const token = await getBearerToken()
  const response = await safeFetch(
    `${env.miCorreoApiBaseUrl}/rates`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: env.miCorreoCustomerId,
        postalCodeOrigin: env.miCorreoPostalCodeOrigin,
        postalCodeDestination: destinationPostalCode,
        deliveredType: params.deliveredType ?? 'D',
        dimensions: {
          weight: params.parcel.weightG,
          height: params.parcel.heightCm,
          width: params.parcel.widthCm,
          length: params.parcel.lengthCm,
        },
      }),
    },
    'error obteniendo rates',
  )

  if (!response.ok) {
    const detail = await parseError(response)
    console.error(`[MiCorreo] error obteniendo rates: HTTP ${response.status} - ${detail}`)
    throw new Error(`MiCorreo rechazó la cotización (${response.status}): ${detail}`)
  }

  const rawPayload = (await response.json().catch(() => null)) as unknown
  const payload = parseRateResponsePayload(rawPayload)
  if (!payload) {
    console.error('[MiCorreo] error obteniendo rates: respuesta JSON inválida')
    throw new Error('MiCorreo devolvió una respuesta de cotización inválida')
  }

  const rates = payload.rates
    .map(normalizeRate)
    .filter((rate): rate is NormalizedMiCorreoRate => rate != null)
    .sort((a, b) => a.price - b.price)

  if (rates.length === 0) {
    console.error('[MiCorreo] error obteniendo rates: MiCorreo devolvió rates vacío')
    throw new Error('Correo Argentino no devolvió tarifas para ese código postal')
  }

  return {
    validTo: payload.validTo,
    rates,
  }
}
