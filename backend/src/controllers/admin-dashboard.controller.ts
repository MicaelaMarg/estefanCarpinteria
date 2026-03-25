import type { Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface AggRow extends RowDataPacket {
  total_orders: number
  orders_pending: number
  orders_paid: number
  orders_failed: number
  revenue_paid: string | number | null
}

interface MonthRow extends RowDataPacket {
  revenue_month_paid: string | number | null
}

interface FulfillmentRow extends RowDataPacket {
  fulfillment_status: string
  cnt: number
}

function dashboardErrorResponse(error: unknown): { status: number; message: string } {
  const e = error as { code?: string; errno?: number }
  logMysqlError('getAdminDashboard', error)
  if (e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE') {
    return { status: 500, message: 'La tabla orders no existe. Ejecutá las migraciones SQL en MySQL.' }
  }
  if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
    return {
      status: 500,
      message:
        'Falta la columna fulfillment_status u otra columna. Ejecutá la migración 008 en MySQL.',
    }
  }
  if (
    e.code === 'ECONNREFUSED' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    return { status: 503, message: 'Sin conexión a MySQL.' }
  }
  return { status: 500, message: 'No se pudo cargar el panel de estadísticas.' }
}

export const getAdminDashboard = async (_req: AuthRequest, res: Response) => {
  try {
    const [[agg]] = await pool.query<AggRow[]>(
      `SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS orders_pending,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS orders_paid,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS orders_failed,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenue_paid
       FROM orders`,
    )

    const [[month]] = await pool.query<MonthRow[]>(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue_month_paid
       FROM orders
       WHERE status = 'paid'
         AND YEAR(created_at) = YEAR(CURDATE())
         AND MONTH(created_at) = MONTH(CURDATE())`,
    )

    const fulfillment_breakdown: Record<string, number> = {
      pendiente: 0,
      listo: 0,
      enviado: 0,
      entregado: 0,
    }
    try {
      const [fulfillmentRows] = await pool.query<FulfillmentRow[]>(
        `SELECT fulfillment_status, COUNT(*) AS cnt
         FROM orders
         WHERE status = 'paid'
         GROUP BY fulfillment_status`,
      )
      for (const row of fulfillmentRows) {
        const k = row.fulfillment_status
        if (k in fulfillment_breakdown) {
          fulfillment_breakdown[k as keyof typeof fulfillment_breakdown] = Number(row.cnt)
        }
      }
    } catch (e) {
      const err = e as { errno?: number; code?: string }
      if (err.errno !== 1054 && err.code !== 'ER_BAD_FIELD_ERROR') throw e
    }

    const data = {
      total_orders: Number(agg?.total_orders ?? 0),
      orders_pending: Number(agg?.orders_pending ?? 0),
      orders_paid: Number(agg?.orders_paid ?? 0),
      orders_failed: Number(agg?.orders_failed ?? 0),
      revenue_paid: Number(agg?.revenue_paid ?? 0),
      revenue_month_paid: Number(month?.revenue_month_paid ?? 0),
      fulfillment_breakdown,
    }

    return sendSuccess(res, data, 1, '')
  } catch (error) {
    const { status, message } = dashboardErrorResponse(error)
    return sendError(res, message, status)
  }
}
