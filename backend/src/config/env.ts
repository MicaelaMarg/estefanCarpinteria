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

const databaseUrl = process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? ''
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
const isLocalDb = dbHost === 'localhost' || dbHost === '127.0.0.1'
const dbUseSsl =
  process.env.DB_SSL === 'true' || (nodeEnv === 'production' && !isLocalDb && dbHost !== '')

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv,
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  dbUseSsl,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@carpinteria.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin1234',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  uploadDir: process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'),
  /** URL pública del backend (sin barra final), ej. https://api.xxx.railway.app — para URLs absolutas de uploads */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, ''),
}

export function toPublicAssetUrl(assetPath: string): string {
  if (!assetPath) return assetPath
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath
  if (!env.publicBaseUrl) return assetPath
  return `${env.publicBaseUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`
}
