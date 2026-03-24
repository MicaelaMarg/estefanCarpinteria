import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { verifyMysqlOnBoot } from './db/verifyConnection.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import adminRouter from './routes/admin.routes.js'
import authRouter from './routes/auth.routes.js'
import productsRouter from './routes/products.routes.js'
import { sendError, sendSuccess } from './utils/response.js'

fs.mkdirSync(env.uploadDir, { recursive: true })

const app = express()

const corsOrigins =
  env.corsOrigin === '*'
    ? true
    : env.corsOrigin
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
)
app.use('/uploads', express.static(env.uploadDir))
app.use(express.json({ limit: '1mb' }))

function isMissingTable(err: unknown): boolean {
  const e = err as { errno?: number; code?: string }
  return e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE'
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    let adminUsers: 'ok' | 'missing' | 'error' = 'ok'
    let products: 'ok' | 'missing' | 'error' = 'ok'
    try {
      await pool.query('SELECT 1 FROM admin_users LIMIT 1')
    } catch (e) {
      if (isMissingTable(e)) {
        adminUsers = 'missing'
      } else {
        adminUsers = 'error'
        console.error('[health] admin_users:', e)
      }
    }
    try {
      await pool.query('SELECT 1 FROM products LIMIT 1')
    } catch (e) {
      if (isMissingTable(e)) {
        products = 'missing'
      } else {
        products = 'error'
        console.error('[health] products:', e)
      }
    }
    return sendSuccess(
      res,
      { ok: true, database: true, admin_users: adminUsers, products },
      1,
      'API operativa',
    )
  } catch (e) {
    console.error('[health] database:', e)
    return sendError(res, 'Sin conexión a la base de datos', 503)
  }
})

app.use('/api/products', productsRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)

app.use(notFoundHandler)
app.use(errorHandler)

async function main() {
  await verifyMysqlOnBoot()
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Server running on port ${env.port}`)
    if (env.isRailway || env.nodeEnv === 'production') {
      console.log(
        `[boot] db host=${env.dbHost} port=${env.dbPort} database=${env.dbName} ssl=${env.dbUseSsl}`,
      )
    }
  })
}

main().catch((err) => {
  console.error('[boot] Error al iniciar:', err)
  process.exit(1)
})
