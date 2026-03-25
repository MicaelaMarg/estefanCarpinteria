import type { RowDataPacket } from 'mysql2'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import { logMysqlError } from '../db/mysqlError.js'

interface SettingsRow extends RowDataPacket {
  shipping_delivery_price_ars: string | number
}

const MAX_SHIPPING_ARS = 1_000_000

function envFallback(): number {
  return env.shippingDeliveryPriceArs
}

/** Precio envío a domicilio (ARS): DB `app_settings` o variable de entorno si la tabla no existe. */
export async function getShippingDeliveryPriceArs(): Promise<number> {
  try {
    const [rows] = await pool.query<SettingsRow[]>(
      'SELECT shipping_delivery_price_ars FROM app_settings WHERE id = 1 LIMIT 1',
    )
    const row = rows[0]
    if (!row) return envFallback()
    const n = Number(row.shipping_delivery_price_ars)
    if (!Number.isFinite(n) || n < 0) return envFallback()
    return Math.min(n, MAX_SHIPPING_ARS)
  } catch (e) {
    logMysqlError('getShippingDeliveryPriceArs', e)
    return envFallback()
  }
}

export function clampShippingPriceArs(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > MAX_SHIPPING_ARS) return null
  return Math.round(n * 100) / 100
}

export async function setShippingDeliveryPriceArs(price: number): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (id, shipping_delivery_price_ars) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE shipping_delivery_price_ars = VALUES(shipping_delivery_price_ars)`,
    [price.toFixed(2)],
  )
}
