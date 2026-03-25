import type { Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface CountRow extends RowDataPacket {
  total: number
}

interface OrderRow extends RowDataPacket {
  id: number
  status: string
  total_amount: string | number
  currency_id: string
  preference_id: string | null
  payment_id: string | null
  created_at: Date
  updated_at: Date
  shipping_method?: string | null
  shipping_cost?: string | number | null
  shipping_contact_name?: string | null
  shipping_phone?: string | null
  shipping_address?: string | null
  shipping_notes?: string | null
}

interface OrderItemRow extends RowDataPacket {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: string | number
  title: string
}

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function serializeOrder(row: OrderRow) {
  return {
    id: row.id,
    status: row.status,
    total_amount: Number(row.total_amount),
    currency_id: row.currency_id,
    preference_id: row.preference_id,
    payment_id: row.payment_id,
    shipping_method: row.shipping_method ?? null,
    shipping_cost:
      row.shipping_cost !== undefined && row.shipping_cost !== null
        ? Number(row.shipping_cost)
        : null,
    shipping_contact_name: row.shipping_contact_name ?? null,
    shipping_phone: row.shipping_phone ?? null,
    shipping_address: row.shipping_address ?? null,
    shipping_notes: row.shipping_notes ?? null,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

function listOrdersErrorResponse(error: unknown): { status: number; message: string } {
  const e = error as { code?: string; errno?: number }
  logMysqlError('listAdminOrders', error)

  if (e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE') {
    return {
      status: 500,
      message: 'La tabla orders no existe. Ejecutá las migraciones SQL (005) en MySQL.',
    }
  }
  if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
    return {
      status: 500,
      message:
        'La tabla orders no tiene columnas de envío. Ejecutá las migraciones 006 y 007 en MySQL.',
    }
  }
  if (
    e.code === 'ECONNREFUSED' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    return { status: 503, message: 'Sin conexión a MySQL.' }
  }
  return { status: 500, message: 'No se pudieron listar los pedidos.' }
}

export const listAdminOrders = async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parsePositiveNumber(req.query.limit, 50), 100)
  const page = parsePositiveNumber(req.query.page, 1)
  const offset = (page - 1) * limit
  const statusRaw = String(req.query.status ?? '').trim()
  const statusFilter =
    statusRaw === 'pending' || statusRaw === 'paid' || statusRaw === 'failed' ? statusRaw : ''

  try {
    let countSql = 'SELECT COUNT(*) AS total FROM orders'
    let listSql = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?'
    const countParams: unknown[] = []
    const listParams: unknown[] = [limit, offset]

    if (statusFilter) {
      countSql = 'SELECT COUNT(*) AS total FROM orders WHERE status = ?'
      listSql = 'SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      countParams.push(statusFilter)
      listParams.unshift(statusFilter)
    }

    const [countRows] = await pool.query<CountRow[]>(countSql, countParams)
    const total = countRows[0]?.total ?? 0

    const [orderRows] = await pool.query<OrderRow[]>(listSql, listParams)
    const ids = orderRows.map((o) => o.id)

    const itemsByOrder = new Map<number, OrderItemRow[]>()
    if (ids.length > 0) {
      const ph = ids.map(() => '?').join(',')
      const [itemRows] = await pool.query<OrderItemRow[]>(
        `SELECT id, order_id, product_id, quantity, unit_price, title
         FROM order_items WHERE order_id IN (${ph}) ORDER BY id ASC`,
        ids,
      )
      for (const row of itemRows) {
        const list = itemsByOrder.get(row.order_id) ?? []
        list.push(row)
        itemsByOrder.set(row.order_id, list)
      }
    }

    const data = orderRows.map((o) => ({
      ...serializeOrder(o),
      items: (itemsByOrder.get(o.id) ?? []).map((it) => ({
        id: it.id,
        order_id: it.order_id,
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        title: it.title,
      })),
    }))

    return sendSuccess(res, data, total, '')
  } catch (error) {
    const { status, message } = listOrdersErrorResponse(error)
    return sendError(res, message, status)
  }
}
