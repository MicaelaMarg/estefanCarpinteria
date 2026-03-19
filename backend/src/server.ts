import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import authRouter from './routes/auth.routes.js'
import productsRouter from './routes/products.routes.js'
import { sendSuccess } from './utils/response.js'

const app = express()

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1')
  return sendSuccess(res, { ok: true }, 1, 'API operativa')
})

app.use('/api/products', productsRouter)
app.use('/api/auth', authRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`)
})
