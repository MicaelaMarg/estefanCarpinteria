import type { Request, Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { env, toPublicAssetUrl } from '../config/env.js'
import { pool } from '../db/pool.js'
import { getPreferenceApi } from '../services/mercadopago.service.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface CartBodyItem {
  id?: unknown
  quantity?: unknown
}

interface ProductRow extends RowDataPacket {
  id: number
  name: string
  price: string
  stock_disponible: number
  image_url: string
}

const MAX_LINES = 40
const MAX_QTY = 99

function parseCartItems(body: unknown): { id: number; quantity: number }[] | null {
  if (!body || typeof body !== 'object' || !('items' in body)) return null
  const items = (body as { items: unknown }).items
  if (!Array.isArray(items) || items.length === 0) return null
  if (items.length > MAX_LINES) return null

  const out: { id: number; quantity: number }[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') return null
    const { id, quantity } = raw as CartBodyItem
    const pid = Number(id)
    const qty = Number(quantity)
    if (!Number.isInteger(pid) || pid <= 0) return null
    if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY) return null
    out.push({ id: pid, quantity: qty })
  }
  return out
}

export const postCheckout = async (req: Request, res: Response) => {
  if (!env.mercadopagoAccessToken) {
    console.error('[checkout] falta MERCADOPAGO_ACCESS_TOKEN')
    return sendError(res, 'Pagos no configurados en el servidor', 503)
  }

  const parsed = parseCartItems(req.body)
  if (!parsed) {
    return sendError(res, 'Carrito inválido: enviá { items: [{ id, quantity }] }', 400)
  }

  const merged = new Map<number, number>()
  for (const line of parsed) {
    const next = (merged.get(line.id) ?? 0) + line.quantity
    if (next > MAX_QTY) {
      return sendError(res, `Cantidad máxima por producto: ${MAX_QTY}`, 400)
    }
    merged.set(line.id, next)
  }
  const linesInput = [...merged.entries()].map(([id, quantity]) => ({ id, quantity }))

  const uniqueIds = [...merged.keys()]
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const placeholders = uniqueIds.map(() => '?').join(',')
    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT id, name, price, stock_disponible, image_url
       FROM products
       WHERE id IN (${placeholders})
       FOR UPDATE`,
      uniqueIds,
    )

    if (productRows.length !== uniqueIds.length) {
      await conn.rollback()
      return sendError(res, 'Uno o más productos no existen', 400)
    }

    const byId = new Map(productRows.map((p) => [p.id, p]))
    let totalAmount = 0
    const lines: { productId: number; quantity: number; unitPrice: number; title: string; picture?: string }[] =
      []

    for (const line of linesInput) {
      const p = byId.get(line.id)
      if (!p) {
        await conn.rollback()
        return sendError(res, 'Producto no encontrado', 400)
      }
      const stock = Number(p.stock_disponible ?? 0)
      if (stock < line.quantity) {
        await conn.rollback()
        return sendError(
          res,
          `Stock insuficiente para "${p.name}" (pediste ${line.quantity}, hay ${stock})`,
          409,
        )
      }
      const unitPrice = Number(p.price)
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        await conn.rollback()
        return sendError(res, `Precio inválido para "${p.name}"`, 500)
      }
      totalAmount += unitPrice * line.quantity
      const pic = toPublicAssetUrl(p.image_url)
      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unitPrice,
        title: p.name.slice(0, 180),
        picture: pic.startsWith('http') ? pic : undefined,
      })
    }

    const [orderResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders (status, total_amount, currency_id) VALUES ('pending', ?, 'ARS')`,
      [totalAmount.toFixed(2)],
    )
    const orderId = orderResult.insertId

    for (const line of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, title)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.quantity, line.unitPrice.toFixed(2), line.title],
      )
    }

    await conn.commit()

    const base = env.publicFrontendUrl
    const notificationUrl = env.publicBaseUrl
      ? `${env.publicBaseUrl}/api/webhook`
      : undefined
    if (!notificationUrl) {
      console.warn(
        '[checkout] PUBLIC_BASE_URL vacío: Mercado Pago no recibirá webhooks hasta configurarlo en Railway',
      )
    }

    const preferenceApi = getPreferenceApi()
    let preferenceId: string | undefined
    let initPoint: string | undefined

    try {
      const pref = await preferenceApi.create({
        body: {
          items: lines.map((line) => ({
            id: String(line.productId),
            title: line.title,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            currency_id: 'ARS',
            ...(line.picture ? { picture_url: line.picture } : {}),
          })),
          external_reference: String(orderId),
          back_urls: {
            success: `${base}/pago/exito`,
            failure: `${base}/pago/error`,
            pending: `${base}/pago/pendiente`,
          },
          auto_return: 'approved',
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        },
      })

      preferenceId = pref.id
      initPoint = pref.init_point ?? pref.sandbox_init_point

      if (!preferenceId || !initPoint) {
        throw new Error('Preferencia sin id o init_point')
      }

      await pool.query('UPDATE orders SET preference_id = ? WHERE id = ?', [preferenceId, orderId])
    } catch (e) {
      console.error('[checkout] Mercado Pago preference.create:', e)
      await pool.query('DELETE FROM orders WHERE id = ?', [orderId])
      const msg = e instanceof Error ? e.message : String(e)
      return sendError(res, `No se pudo iniciar el pago: ${msg}`, 502)
    }

    return sendSuccess(
      res,
      {
        init_point: initPoint,
        preference_id: preferenceId,
        order_id: orderId,
      },
      1,
      'Listo para Mercado Pago',
    )
  } catch (e) {
    await conn.rollback()
    console.error('[checkout]', e)
    return sendError(res, 'Error al crear el pedido', 500)
  } finally {
    conn.release()
  }
}
