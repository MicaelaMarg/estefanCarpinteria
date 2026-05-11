import dotenv from 'dotenv'

dotenv.config()

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: process.env.DB_USER ?? 'root',
  dbPassword: process.env.DB_PASSWORD ?? '',
  dbName: process.env.DB_NAME ?? 'carpinteria',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@carpinteria.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin1234',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  dbAutoSeed: parseBooleanEnv(process.env.DB_AUTO_SEED, true),
}
