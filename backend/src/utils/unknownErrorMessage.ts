/** Texto seguro para APIs / logs cuando el SDK u otra capa lanza algo que no es Error. */
export function unknownErrorMessage(e: unknown, fallback = 'Error desconocido'): string {
  if (typeof e === 'string') return e
  if (e instanceof Error && e.message.trim()) return e.message.trim()

  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>

    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()

    const apiMsg = extractMercadoPagoApiMessage(o)
    if (apiMsg) return apiMsg

    if (o.cause !== undefined) return unknownErrorMessage(o.cause, fallback)
  }

  try {
    const s = JSON.stringify(e)
    if (s && s !== '{}') return s.length > 400 ? `${s.slice(0, 400)}…` : s
  } catch {
    /* ignore */
  }

  return fallback
}

function extractMercadoPagoApiMessage(o: Record<string, unknown>): string | null {
  const api = o.apiResponse
  if (!api || typeof api !== 'object') return null
  const a = api as Record<string, unknown>
  const cause = a.cause
  if (Array.isArray(cause) && cause.length > 0) {
    const first = cause[0]
    if (first && typeof first === 'object') {
      const c = first as Record<string, unknown>
      if (typeof c.description === 'string' && c.description.trim()) return c.description.trim()
      if (typeof c.message === 'string' && c.message.trim()) return c.message.trim()
    }
  }
  if (typeof a.message === 'string' && a.message.trim()) return a.message.trim()
  return null
}
