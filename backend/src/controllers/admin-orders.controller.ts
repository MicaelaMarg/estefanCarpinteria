import type { Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { sendError, sendSuccess } from '../utils/response.js'

const FULFILLMENT_VALUES = ['pendiente', 'listo', 'enviado', 'entregado'] as const
type FulfillmentValue = (typeof FULFILLMENT_VALUES)[number]

function isFulfillmentValue(v: string): v is FulfillmentValue {
  return (FULFILLMENT_VALUES as readonly string[]).includes(v)
}

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
  fulfillment_status?: string | null
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

function escapeLikeFragment(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function serializeOrder(row: OrderRow) {
  const fs = row.fulfillment_status
  const fulfillment_status: FulfillmentValue =
    fs && isFulfillmentValue(fs) ? fs : 'pendiente'

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
    fulfillment_status,
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
        'Faltan columnas en orders. Ejecutá migraciones 006, 007 y 008 (envío, contacto y estado manual de entrega).',
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

  const fulfillmentRaw = String(req.query.fulfillment ?? '').trim()
  const fulfillmentFilter = isFulfillmentValue(fulfillmentRaw) ? fulfillmentRaw : ''

  const qRaw = String(req.query.q ?? '').trim().slice(0, 120)
  const useSearch = qRaw.length > 0

  try {
    const conditions: string[] = []
    const baseParams: unknown[] = []

    if (statusFilter) {
      conditions.push('status = ?')
      baseParams.push(statusFilter)
    }
    if (fulfillmentFilter) {
      conditions.push('fulfillment_status = ?')
      baseParams.push(fulfillmentFilter)
    }
    if (useSearch) {
      const esc = escapeLikeFragment(qRaw)
      conditions.push(
        '(shipping_phone LIKE ? ESCAPE ? OR shipping_contact_name LIKE ? ESCAPE ?)',
      )
      baseParams.push(`%${esc}%`, '\\', `%${esc}%`, '\\')
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countSql = `SELECT COUNT(*) AS total FROM orders ${where}`
    const listSql = `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`

    const [countRows] = await pool.query<CountRow[]>(countSql, baseParams)
    const total = countRows[0]?.total ?? 0

    const listParams = [...baseParams, limit, offset]
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

function patchErrorResponse(error: unknown): { status: number; message: string } {
  const e = error as { code?: string; errno?: number }
  logMysqlError('patchOrderFulfillment', error)
  if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
    return {
      status: 500,
      message: 'No existe fulfillment_status en orders. Ejecutá la migración 008 en MySQL.',
    }
  }
  if (
    e.code === 'ECONNREFUSED' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    return { status: 503, message: 'Sin conexión a MySQL.' }
  }
  return { status: 500, message: 'No se pudo actualizar el estado de entrega.' }
}

export const patchOrderFulfillment = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 'ID de pedido inválido', 400)
  }

  const body = req.body as { fulfillment_status?: unknown }
  const raw = typeof body.fulfillment_status === 'string' ? body.fulfillment_status.trim() : ''
  if (!isFulfillmentValue(raw)) {
    return sendError(
      res,
      'fulfillment_status debe ser: pendiente, listo, enviado o entregado',
      400,
    )
  }

  try {
    const [hdr] = await pool.query<ResultSetHeader>(
      'UPDATE orders SET fulfillment_status = ? WHERE id = ?',
      [raw, id],
    )
    const affected = hdr.affectedRows ?? 0
    if (affected === 0) {
      return sendError(res, 'Pedido no encontrado', 404)
    }
    return sendSuccess(res, { id, fulfillment_status: raw }, 1, '')
  } catch (error) {
    const { status, message } = patchErrorResponse(error)
    return sendError(res, message, status)
  }
}
