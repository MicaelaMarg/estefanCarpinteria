/** Resuelve image_url relativa del backend (p. ej. /uploads/x.webp) a URL absoluta para <img src>. */
export function resolveMediaUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'
  const origin = apiBase.replace(/\/api\/?$/i, '').replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${origin}${path}`
}
