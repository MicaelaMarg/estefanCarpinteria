/**
 * MP a veces devuelve "notification_url invalid" si el valor en la preferencia
 * no pasa su validador o choca con la URL del panel. Si omitís el campo,
 * MP usa la URL de Webhooks configurada en Developers (recomendado).
 */
export function resolveMercadoPagoNotificationUrl(options: {
  explicitUrl: string
  publicBaseUrl: string
  sendInPreference: boolean
}): string | undefined {
  const explicit = options.explicitUrl.trim()
  if (explicit) {
    try {
      const u = new URL(explicit)
      if (u.protocol !== 'https:') {
        console.warn('[checkout] MERCADOPAGO_NOTIFICATION_URL debería ser https')
      }
      u.hash = ''
      return u.href.replace(/\/$/, '')
    } catch {
      console.warn('[checkout] MERCADOPAGO_NOTIFICATION_URL inválida, se omite')
      return undefined
    }
  }

  if (!options.sendInPreference) return undefined

  const base = options.publicBaseUrl.trim().replace(/\/$/, '')
  if (!base) return undefined

  try {
    const u = new URL('/api/webhook', base.endsWith('/') ? base : `${base}/`)
    if (u.protocol !== 'https:') {
      console.warn('[checkout] notification_url desde PUBLIC_BASE_URL debería ser https')
    }
    return u.href
  } catch {
    console.warn('[checkout] No se pudo armar notification_url desde PUBLIC_BASE_URL')
    return undefined
  }
}
