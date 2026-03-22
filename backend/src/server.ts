import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import adminRouter from './routes/admin.routes.js'
import authRouter from './routes/auth.routes.js'
import productsRouter from './routes/products.routes.js'
import { sendSuccess } from './utils/response.js'

fs.mkdirSync(env.uploadDir, { recursive: true })

const app = express()

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
    credentials: true,
  }),
)
app.use('/uploads', express.static(env.uploadDir))
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1')
  return sendSuccess(res, { ok: true }, 1, 'API operativa')
})

app.use('/api/products', productsRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on port ${env.port}`)
})
