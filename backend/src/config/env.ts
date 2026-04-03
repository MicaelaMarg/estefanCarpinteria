import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config()

function parseMysqlConnectionString(raw: string): {
  host: string
  port: number
  user: string
  password: string
  database: string
} | null {
  if (!raw || !raw.toLowerCase().startsWith('mysql://')) return null
  try {
    const normalized = raw.replace(/^mysql:\/\//i, 'http://')
    const u = new URL(normalized)
    const database = u.pathname.replace(/^\//, '').split('?')[0]
    const port = u.port ? Number(u.port) : 3306
    if (!u.hostname || !database) return null
    return {
      host: u.hostname,
      port: Number.isFinite(port) ? port : 3306,
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database,
    }
  } catch {
    return null
  }
}

const databaseUrl = (process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? '').trim()
const fromUrl = databaseUrl ? parseMysqlConnectionString(databaseUrl) : null

const dbHost =
  fromUrl?.host ?? process.env.MYSQLHOST ?? process.env.DB_HOST ?? 'localhost'
const dbPort = fromUrl?.port ?? Number(process.env.MYSQLPORT ?? process.env.DB_PORT ?? 3306)
const dbUser = fromUrl?.user ?? process.env.MYSQLUSER ?? process.env.DB_USER ?? 'root'
const dbPassword =
  fromUrl?.password ?? process.env.MYSQLPASSWORD ?? process.env.DB_PASSWORD ?? ''
const dbName =
  fromUrl?.database ?? process.env.MYSQLDATABASE ?? process.env.DB_NAME ?? 'carpinteria'

const nodeEnv = process.env.NODE_ENV ?? 'development'
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT)
/** En Railway NODE_ENV a veces no viene en production; igual necesitamos SSL al MySQL remoto. */
const treatAsDeployed = nodeEnv === 'production' || isRailway
const isLocalDb = dbHost === 'localhost' || dbHost === '127.0.0.1'
const dbUseSsl =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' && treatAsDeployed && !isLocalDb && dbHost !== '')

/**
 * Mercado Pago exige back_urls públicas; en Railway sin PUBLIC_FRONTEND_URL
 * suele quedar localhost y MP devuelve error → 502 en checkout.
 * Si CORS_ORIGIN es una URL concreta (típico en prod), la usamos como fallback.
 */
function resolvePublicFrontendUrl(): string {
  const explicit = (process.env.PUBLIC_FRONTEND_URL ?? '').trim().replace(/\/$/, '')
  if (explicit) return explicit

  const cors = (process.env.CORS_ORIGIN ?? '').trim()
  if (cors && cors !== '*') {
    const first = cors.split(',')[0]?.trim()
    if (first?.startsWith('https://') || first?.startsWith('http://')) {
      return first.replace(/\/$/, '')
    }
  }

  return 'http://localhost:5173'.replace(/\/$/, '')
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv,
  isRailway,
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  dbUseSsl,
  jwtSecret: (process.env.JWT_SECRET ?? 'dev-secret').trim(),
  corsOrigin: (process.env.CORS_ORIGIN ?? '*').trim(),
  adminEmail: (process.env.ADMIN_EMAIL ?? 'mattiuccimicaelammm@gmail.com').trim(),
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin1234',
  adminPasswordHash: (process.env.ADMIN_PASSWORD_HASH ?? '').trim(),
  uploadDir: process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'),
  /** URL pública del backend (sin barra final), ej. https://api.xxx.railway.app — uploads; opcional para notification_url en preferencia */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? '').trim().replace(/\/$/, ''),
  /**
   * Si true, envía notification_url en la preferencia (armada con PUBLIC_BASE_URL).
   * Por defecto false: MP usa solo la URL de Webhooks del panel y evita "notification_url invalid".
   */
  mercadopagoSendNotificationUrl: process.env.MERCADOPAGO_SEND_NOTIFICATION_URL === 'true',
  /** URL completa del webhook (https://.../api/webhook). Tiene prioridad sobre armar desde PUBLIC_BASE_URL. */
  mercadopagoNotificationUrl: (process.env.MERCADOPAGO_NOTIFICATION_URL ?? '').trim(),
  /** URL pública del frontend (sin barra final) — back_urls de Mercado Pago */
  publicFrontendUrl: resolvePublicFrontendUrl(),
  mercadopagoAccessToken: (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').trim(),
  /** Precio fijo envío a domicilio (ARS), solo si el cliente elige delivery. */
  shippingDeliveryPriceArs: Math.max(
    0,
    Number(process.env.SHIPPING_DELIVERY_PRICE_ARS ?? 8000) || 0,
  ),
  /** Respaldo si falta columna Correo en app_settings (migración 010). */
  shippingCorreoArgentinoPriceArs: Math.max(
    0,
    Number(process.env.SHIPPING_CORREO_ARGENTINO_PRICE_ARS ?? 10000) || 0,
  ),
  miCorreoApiBaseUrl: (process.env.MICORREO_API_BASE_URL ?? 'https://api.correoargentino.com.ar/micorreo/v1')
    .trim()
    .replace(/\/$/, ''),
  miCorreoApiUser: (process.env.MICORREO_API_USER ?? '').trim(),
  miCorreoApiPassword: (process.env.MICORREO_API_PASSWORD ?? '').trim(),
  miCorreoCustomerId: (process.env.MICORREO_CUSTOMER_ID ?? '').trim(),
  miCorreoPostalCodeOrigin: (process.env.MICORREO_POSTAL_CODE_ORIGIN ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ''),
  paqArApiBaseUrl: (process.env.PAQAR_API_BASE_URL ?? 'https://api.correoargentino.com.ar/paqar/v1')
    .trim()
    .replace(/\/$/, ''),
  paqArAgreement: (process.env.PAQAR_AGREEMENT ?? '').trim(),
  paqArApiKey: (process.env.PAQAR_API_KEY ?? '').trim(),
}

export function toPublicAssetUrl(assetPath: string): string {
  if (!assetPath) return assetPath
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath
  if (!env.publicBaseUrl) return assetPath
  return `${env.publicBaseUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`
}
