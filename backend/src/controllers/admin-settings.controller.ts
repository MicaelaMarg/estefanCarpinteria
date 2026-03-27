import type { Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { env } from '../config/env.js'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import {
  clampShippingPriceArs,
  getShippingCorreoArgentinoPriceArs,
  getShippingDeliveryPriceArs,
  upsertShippingPrices,
} from '../services/app-settings.service.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface SettingsRow extends RowDataPacket {
  shipping_delivery_price_ars: string | number
  shipping_correo_argentino_price_ars?: string | number
  updated_at: Date
}

export const getAdminShippingSettings = async (_req: AuthRequest, res: Response) => {
  try {
    const delivery = await getShippingDeliveryPriceArs()
    const correo = await getShippingCorreoArgentinoPriceArs()
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
        shipping_delivery_price_ars: delivery,
        shipping_correo_argentino_price_ars: correo,
        env_fallback_delivery_ars: env.shippingDeliveryPriceArs,
        env_fallback_correo_ars: env.shippingCorreoArgentinoPriceArs,
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
  const body = req.body as {
    shipping_delivery_price_ars?: unknown
    shipping_correo_argentino_price_ars?: unknown
  }
  const delivery = clampShippingPriceArs(body.shipping_delivery_price_ars)
  const correo = clampShippingPriceArs(body.shipping_correo_argentino_price_ars)
  if (delivery === null || correo === null) {
    return sendError(
      res,
      'Envíá shipping_delivery_price_ars y shipping_correo_argentino_price_ars (números entre 0 y 1.000.000 ARS).',
      400,
    )
  }

  try {
    await upsertShippingPrices(delivery, correo)
    return sendSuccess(
      res,
      {
        shipping_delivery_price_ars: delivery,
        shipping_correo_argentino_price_ars: correo,
      },
      1,
      '',
    )
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
    if (err.errno === 1054 || err.code === 'ER_BAD_FIELD_ERROR') {
      return sendError(
        res,
        'Falta la columna shipping_correo_argentino_price_ars. Ejecutá la migración 010 en MySQL.',
        500,
      )
    }
    return sendError(res, 'No se pudieron guardar los precios de envío.', 500)
  }
}
