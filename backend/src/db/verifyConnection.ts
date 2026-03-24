import { env } from '../config/env.js'
import { pool } from './pool.js'
import { logMysqlError } from './mysqlError.js'

/** Ping a MySQL al arrancar; no tumba el proceso (health sigue siendo la fuente de verdad). */
export async function verifyMysqlOnBoot(): Promise<boolean> {
  try {
    await pool.query('SELECT 1 AS ping')
    console.log('[boot] MySQL: ping OK')
    return true
  } catch (error) {
    logMysqlError('boot ping falló', error)
    if (env.isRailway || env.nodeEnv === 'production') {
      console.error(
        '[boot] El servidor arranca igual; si MySQL sigue caído, GET /api/health devolverá 503.',
      )
    }
    return false
  }
}
