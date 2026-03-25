import type { Request, Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { Product } from '../types/api.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface CountRow extends RowDataPacket {
  total: number
}

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function productsQueryErrorResponse(error: unknown): { status: number; message: string } {
  const e = error as { code?: string; errno?: number; sqlMessage?: string }
  logMysqlError('getProducts / getProductById', error)

  if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
    return {
      status: 500,
      message:
        'La tabla products no tiene las columnas esperadas (p. ej. stock_cargado, stock_disponible). En Railway MySQL ejecutá la migración 002_add_product_stock.sql o el ALTER del repo.',
    }
  }
  if (e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE') {
    return {
      status: 500,
      message: 'La tabla products no existe. Ejecutá backend/sql/schema.sql en MySQL.',
    }
  }
  if (
    e.code === 'ECONNREFUSED' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    return { status: 503, message: 'Sin conexión a MySQL. Reintentá más tarde.' }
  }
  return {
    status: 500,
    message: 'No se pudieron obtener los productos. Revisá logs del backend en Railway.',
  }
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveNumber(req.query.page, 1)
    const limit = parsePositiveNumber(req.query.limit, 9)
    const offset = (page - 1) * limit
    const q = String(req.query.q ?? '').trim()
    const category = String(req.query.category ?? '').trim()
    const minPrice = Number(req.query.minPrice ?? 0)
    const maxPrice = Number(req.query.maxPrice ?? 0)

    const filters: string[] = []
    const params: Array<string | number> = []

    if (q) {
      filters.push('(name LIKE ? OR description LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    if (category) {
      filters.push('category = ?')
      params.push(category)
    }

    if (!Number.isNaN(minPrice) && minPrice > 0) {
      filters.push('price >= ?')
      params.push(minPrice)
    }

    if (!Number.isNaN(maxPrice) && maxPrice > 0) {
      filters.push('price <= ?')
      params.push(maxPrice)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const countQuery = `SELECT COUNT(*) AS total FROM products ${whereClause}`
    const [countRows] = await pool.query<CountRow[]>(countQuery, params)
    const total = countRows[0]?.total ?? 0

    const productsQuery = `
      SELECT id, name, description, price, category, image_url, video_url, stock_cargado, stock_disponible, created_at
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const [rows] = await pool.query<Product[]>(productsQuery, [...params, limit, offset])

    return sendSuccess(res, rows, total)
  } catch (error) {
    const { status, message } = productsQueryErrorResponse(error)
    return sendError(res, message, status)
  }
}

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 'ID de producto inválido', 400)
    }

    const [rows] = await pool.query<Product[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
    const product = rows[0]

    if (!product) {
      return sendError(res, 'Producto no encontrado', 404)
    }

    return sendSuccess(res, product, 1)
  } catch (error) {
    const { status, message } = productsQueryErrorResponse(error)
    return sendError(res, message, status)
  }
}
