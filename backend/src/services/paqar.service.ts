import { logMysqlError } from '../db/mysqlError.js'
import { env } from '../config/env.js'

interface PaqArErrorResponse {
  message?: string
  error?: string
  status?: number
  path?: string
  timestamp?: string
}

export function isPaqArConfigured(): boolean {
  return Boolean(env.paqArApiBaseUrl && env.paqArAgreement && env.paqArApiKey)
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  return {
    agreement: env.paqArAgreement,
    Authorization: `Apikey ${env.paqArApiKey}`,
    ...(extra ?? {}),
  }
}

async function parseError(response: Response): Promise<string> {
  const fallback = 'No se pudo comunicar con PAQ.AR'
  const json = (await response.json().catch(() => null)) as PaqArErrorResponse | null
  return json?.message || json?.error || fallback
}

export async function validatePaqArCredentials(): Promise<void> {
  if (!isPaqArConfigured()) {
    throw new Error('Faltan credenciales oficiales de PAQ.AR')
  }

  const response = await fetch(`${env.paqArApiBaseUrl}/auth`, {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (response.status === 204) {
    return
  }

  throw new Error(await parseError(response))
}

export function logPaqArError(context: string, error: unknown): void {
  logMysqlError(`paqar:${context}`, error)
}
