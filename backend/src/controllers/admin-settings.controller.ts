import type { Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { env } from '../config/env.js'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import {
  clampShippingPriceArs,
  getShippingDeliveryPriceArs,
  setShippingDeliveryPriceArs,
} from '../services/app-settings.service.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface SettingsRow extends RowDataPacket {
  shipping_delivery_price_ars: string | number
  updated_at: Date
}

export const getAdminShippingSettings = async (_req: AuthRequest, res: Response) => {
  try {
    const price = await getShippingDeliveryPriceArs()
    let updatedAt: string | null = null
    try {
      const [rows] = await pool.query<SettingsRow[]>(
        'SELECT updated_at FROM app_settings WHERE id = 1 LIMIT 1',
      )
      const u = rows[0]?.updated_at
      updatedAt = u instanceof Date ? u.toISOString() : u != null ? String(u) : null
    } catch {
      /* sin fila o tabla */
    }
    return sendSuccess(
      res,
      {
        shipping_delivery_price_ars: price,
        env_fallback_ars: env.shippingDeliveryPriceArs,
        updated_at: updatedAt,
      },
      1,
      '',
    )
  } catch (e) {
    logMysqlError('getAdminShippingSettings', e)
    return sendError(res, 'No se pudieron leer los ajustes de envío.', 500)
  }
}

export const patchAdminShippingSettings = async (req: AuthRequest, res: Response) => {
  const body = req.body as { shipping_delivery_price_ars?: unknown }
  const price = clampShippingPriceArs(body.shipping_delivery_price_ars)
  if (price === null) {
    return sendError(
      res,
      `shipping_delivery_price_ars debe ser un número entre 0 y 1.000.000 (ARS)`,
      400,
    )
  }

  try {
    await setShippingDeliveryPriceArs(price)
    return sendSuccess(res, { shipping_delivery_price_ars: price }, 1, '')
  } catch (e) {
    logMysqlError('patchAdminShippingSettings', e)
    const err = e as { errno?: number; code?: string }
    if (err.errno === 1146 || err.code === 'ER_NO_SUCH_TABLE') {
      return sendError(
        res,
        'Falta la tabla app_settings. Ejecutá la migración 009 en MySQL.',
        500,
      )
    }
    return sendError(res, 'No se pudo guardar el precio de envío.', 500)
  }
}
