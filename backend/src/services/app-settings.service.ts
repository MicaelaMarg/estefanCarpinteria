import type { RowDataPacket } from 'mysql2'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import { logMysqlError } from '../db/mysqlError.js'

interface SettingsRow extends RowDataPacket {
  shipping_delivery_price_ars: string | number
  shipping_correo_argentino_price_ars?: string | number
}

const MAX_SHIPPING_ARS = 1_000_000

function envFallbackDelivery(): number {
  return env.shippingDeliveryPriceArs
}

function envFallbackCorreo(): number {
  return env.shippingCorreoArgentinoPriceArs
}

function readPrice(v: unknown, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(n, MAX_SHIPPING_ARS)
}

/** Precio envío a domicilio (ARS): DB o env si falla la tabla. */
export async function getShippingDeliveryPriceArs(): Promise<number> {
  try {
    const [rows] = await pool.query<SettingsRow[]>(
      'SELECT shipping_delivery_price_ars FROM app_settings WHERE id = 1 LIMIT 1',
    )
    const row = rows[0]
    if (!row) return envFallbackDelivery()
    return readPrice(row.shipping_delivery_price_ars, envFallbackDelivery())
  } catch (e) {
    logMysqlError('getShippingDeliveryPriceArs', e)
    return envFallbackDelivery()
  }
}

/** Precio envío por Correo Argentino (ARS): DB o env. Requiere migración 010 para columna. */
export async function getShippingCorreoArgentinoPriceArs(): Promise<number> {
  try {
    const [rows] = await pool.query<SettingsRow[]>(
      'SELECT shipping_correo_argentino_price_ars FROM app_settings WHERE id = 1 LIMIT 1',
    )
    const row = rows[0]
    if (!row || row.shipping_correo_argentino_price_ars === undefined) return envFallbackCorreo()
    return readPrice(row.shipping_correo_argentino_price_ars, envFallbackCorreo())
  } catch (e) {
    const err = e as { errno?: number; code?: string }
    if (err.errno === 1054 || err.code === 'ER_BAD_FIELD_ERROR') {
      return envFallbackCorreo()
    }
    logMysqlError('getShippingCorreoArgentinoPriceArs', e)
    return envFallbackCorreo()
  }
}

export function clampShippingPriceArs(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > MAX_SHIPPING_ARS) return null
  return Math.round(n * 100) / 100
}

export async function upsertShippingPrices(delivery: number, correo: number): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (id, shipping_delivery_price_ars, shipping_correo_argentino_price_ars)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE
       shipping_delivery_price_ars = VALUES(shipping_delivery_price_ars),
       shipping_correo_argentino_price_ars = VALUES(shipping_correo_argentino_price_ars)`,
    [delivery.toFixed(2), correo.toFixed(2)],
  )
}
