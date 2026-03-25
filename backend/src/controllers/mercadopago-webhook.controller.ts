import type { Request, Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import { getPaymentApi } from '../services/mercadopago.service.js'

interface OrderItemRow extends RowDataPacket {
  product_id: number
  quantity: number
}

function extractPaymentId(req: Request): string | null {
  const qTopic = String(req.query.topic ?? '')
  const qId = String(req.query.id ?? '')
  if (qTopic === 'payment' && qId && /^\d+$/.test(qId)) return qId

  const body = req.body as Record<string, unknown> | null | undefined
  if (!body || typeof body !== 'object') return null

  const data = body.data as Record<string, unknown> | undefined
  if (data && typeof data === 'object' && data.id != null) {
    const id = String(data.id)
    if (/^\d+$/.test(id)) return id
  }

  const legacyId = body.id
  if (legacyId != null) {
    const id = String(legacyId)
    if (/^\d+$/.test(id)) return id
  }

  return null
}

async function applyPaidOrder(orderId: number, paymentId: string): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [upd] = await conn.query<ResultSetHeader>(
      `UPDATE orders
       SET status = 'paid', payment_id = ?
       WHERE id = ? AND status = 'pending'`,
      [paymentId, orderId],
    )

    if (upd.affectedRows === 0) {
      await conn.commit()
      return
    }

    const [items] = await conn.query<OrderItemRow[]>(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId],
    )

    for (const row of items) {
      const [r] = await conn.query<ResultSetHeader>(
        `UPDATE products
         SET stock_disponible = stock_disponible - ?
         WHERE id = ? AND stock_disponible >= ?`,
        [row.quantity, row.product_id, row.quantity],
      )
      if (r.affectedRows === 0) {
        console.error(
          `[mp-webhook] stock insuficiente al confirmar pago order=${orderId} product=${row.product_id} qty=${row.quantity}`,
        )
      }
    }

    await conn.commit()
    console.log(`[mp-webhook] pedido ${orderId} marcado paid payment=${paymentId}`)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

async function markOrderFailed(orderId: number, paymentId: string): Promise<void> {
  const [r] = await pool.query<ResultSetHeader>(
    `UPDATE orders SET status = 'failed', payment_id = ? WHERE id = ? AND status = 'pending'`,
    [paymentId, orderId],
  )
  if (r.affectedRows) {
    console.log(`[mp-webhook] pedido ${orderId} marcado failed payment=${paymentId}`)
  }
}

export const postMercadoPagoWebhook = async (req: Request, res: Response) => {
  if (!env.mercadopagoAccessToken) {
    console.error('[mp-webhook] MERCADOPAGO_ACCESS_TOKEN no configurado')
    return res.sendStatus(503)
  }

  const paymentId = extractPaymentId(req)
  if (!paymentId) {
    console.warn('[mp-webhook] notificación sin payment id', {
      query: req.query,
      bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body as object) : [],
    })
    return res.sendStatus(200)
  }

  try {
    const paymentApi = getPaymentApi()
    const payment = await paymentApi.get({ id: paymentId })
    const extRef = payment.external_reference
    const status = payment.status

    if (!extRef || !/^\d+$/.test(String(extRef))) {
      console.warn('[mp-webhook] pago sin external_reference válido', { paymentId, extRef })
      return res.sendStatus(200)
    }

    const orderId = Number(extRef)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.sendStatus(200)
    }

    if (status === 'approved') {
      await applyPaidOrder(orderId, paymentId)
    } else if (status === 'rejected' || status === 'cancelled' || status === 'refunded') {
      await markOrderFailed(orderId, paymentId)
    }

    return res.sendStatus(200)
  } catch (e) {
    console.error('[mp-webhook] error procesando pago', paymentId, e)
    return res.sendStatus(500)
  }
}
