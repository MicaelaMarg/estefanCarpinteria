/** URL absoluta del SPA (login, admin, etc.) para abrir en otra pestaña. */
export function spaUrl(path: string): string {
  return adminUrl(path)
}

/** URL absoluta del SPA para abrir rutas admin en otra pestaña. */
export function adminUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const normalized =
    base === '/' ? '' : base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') {
    return `${normalized}${p}`
  }
  return `${window.location.origin}${normalized}${p}`
}
