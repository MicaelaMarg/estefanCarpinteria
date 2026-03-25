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
  /** URL pública del backend (sin barra final), ej. https://api.xxx.railway.app — para URLs absolutas de uploads y webhooks MP */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, ''),
  /** URL pública del frontend (sin barra final) — back_urls de Mercado Pago */
  publicFrontendUrl: resolvePublicFrontendUrl(),
  mercadopagoAccessToken: (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').trim(),
}

export function toPublicAssetUrl(assetPath: string): string {
  if (!assetPath) return assetPath
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath
  if (!env.publicBaseUrl) return assetPath
  return `${env.publicBaseUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`
}
