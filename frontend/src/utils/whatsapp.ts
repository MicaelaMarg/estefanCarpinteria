/** Mensaje por defecto al abrir WhatsApp (footer + botón flotante). */
export const WHATSAPP_DEFAULT_MESSAGE =
  'Hola Estefan Carpintería, quiero consultar por un mueble o proyecto a medida.'

export function waMeUrl(phoneDigits: string, text = WHATSAPP_DEFAULT_MESSAGE): string {
  const q = text.trim() ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${phoneDigits}${q}`
}
