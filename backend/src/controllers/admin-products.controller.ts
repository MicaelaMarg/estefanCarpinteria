import type { Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { logMysqlError } from '../db/mysqlError.js'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import type { Product } from '../types/api.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface CountRow extends RowDataPacket {
  total: number
}

/** Una sola vez por proceso: ver en logs qué base usa el pool (Railway vs local). */
let loggedAdminListDatabase = false

/** Mensaje y status HTTP según error de mysql2 al listar productos */
function listProductsErrorResponse(error: unknown): { status: number; message: string } {
  const e = error as { code?: string; errno?: number; sqlMessage?: string }
  logMysqlError('listAdminProducts', error)

  if (e.errno === 1146 || e.code === 'ER_NO_SUCH_TABLE') {
    return {
      status: 500,
      message:
        'La tabla products no existe en MySQL. En Railway: ejecutá schema.sql y migraciones (001, 002, …) en el plugin MySQL → Query.',
    }
  }
  if (
    e.code === 'ECONNREFUSED' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'ENOTFOUND' ||
    e.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    return {
      status: 503,
      message:
        'No se pudo conectar a MySQL. Revisá que el servicio MySQL esté arriba y las variables DATABASE_URL / MYSQL* en el backend.',
    }
  }
  return {
    status: 500,
    message:
      'No se pudieron listar los productos (error en la base de datos). Mirá los logs del servicio backend en Railway para el detalle.',
  }
}

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

type ProductBody = {
  name?: string
  description?: string
  price?: number
  category?: string
  image_url?: string
  video_url?: string | null
  stock_cargado?: number
  stock_disponible?: number
}

const nonNegativeInt = (value: unknown, fallback: number) => {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

const validateCreate = (body: ProductBody) => {
  const name = String(body.name ?? '').trim()
  const description = String(body.description ?? '').trim()
  const category = String(body.category ?? '').trim()
  const image_url = String(body.image_url ?? '').trim()
  const price = Number(body.price)
  const videoRaw = body.video_url
  const video_url =
    videoRaw === null || videoRaw === undefined || videoRaw === ''
      ? null
      : String(videoRaw).trim().slice(0, 2048)

  if (!name || name.length > 180) {
    return { error: 'Nombre inválido (máx. 180 caracteres)' as const }
  }
  if (!description) {
    return { error: 'La descripción es obligatoria' as const }
  }
  if (!category || category.length > 80) {
    return { error: 'Categoría inválida (máx. 80 caracteres)' as const }
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Precio inválido' as const }
  }
  if (!image_url) {
    return { error: 'URL de imagen obligatoria' as const }
  }
  if (image_url.length > 2048) {
    return { error: 'URL de imagen demasiado larga' as const }
  }

  const stock_cargado = nonNegativeInt(body.stock_cargado, 0)
  const stock_disponible = nonNegativeInt(body.stock_disponible, 0)
  if (stock_disponible > stock_cargado) {
    return { error: 'Disponible no puede superar la mercadería cargada' as const }
  }

  return {
    value: { name, description, category, price, image_url, video_url, stock_cargado, stock_disponible },
  }
}

const validatePatch = (body: ProductBody) => {
  const updates: string[] = []
  const params: Array<string | number | null> = []

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name || name.length > 180) {
      return { error: 'Nombre inválido (máx. 180 caracteres)' as const }
    }
    updates.push('name = ?')
    params.push(name)
  }

  if (body.description !== undefined) {
    const description = String(body.description).trim()
    if (!description) {
      return { error: 'La descripción no puede estar vacía' as const }
    }
    updates.push('description = ?')
    params.push(description)
  }

  if (body.category !== undefined) {
    const category = String(body.category).trim()
    if (!category || category.length > 80) {
      return { error: 'Categoría inválida (máx. 80 caracteres)' as const }
    }
    updates.push('category = ?')
    params.push(category)
  }

  if (body.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price < 0) {
      return { error: 'Precio inválido' as const }
    }
    updates.push('price = ?')
    params.push(price)
  }

  if (body.image_url !== undefined) {
    const image_url = String(body.image_url).trim()
    if (!image_url) {
      return { error: 'URL de imagen inválida' as const }
    }
    if (image_url.length > 2048) {
      return { error: 'URL de imagen demasiado larga' as const }
    }
    updates.push('image_url = ?')
    params.push(image_url)
  }

  if (body.video_url !== undefined) {
    const videoRaw = body.video_url
    const video_url =
      videoRaw === null || videoRaw === '' ? null : String(videoRaw).trim().slice(0, 2048)
    updates.push('video_url = ?')
    params.push(video_url)
  }

  if (body.stock_cargado !== undefined) {
    const stock_cargado = nonNegativeInt(body.stock_cargado, 0)
    updates.push('stock_cargado = ?')
    params.push(stock_cargado)
  }

  if (body.stock_disponible !== undefined) {
    const stock_disponible = nonNegativeInt(body.stock_disponible, 0)
    updates.push('stock_disponible = ?')
    params.push(stock_disponible)
  }

  if (updates.length === 0) {
    return { error: 'Nada que actualizar' as const }
  }

  return { updates, params }
}

export const listAdminProducts = async (req: AuthRequest, res: Response) => {
  try {
    if (!loggedAdminListDatabase) {
      loggedAdminListDatabase = true
      try {
        const [dbRows] = await pool.query('SELECT DATABASE() AS db')
        const row = (dbRows as Array<{ db: string | null }>)[0]
        console.log('[admin-products] MySQL DATABASE():', row?.db ?? '(null)')
      } catch (e) {
        logMysqlError('SELECT DATABASE() (debug)', e)
      }
    }

    const page = parsePositiveNumber(req.query.page, 1)
    const limit = Math.min(parsePositiveNumber(req.query.limit, 100), 500)
    const offset = (page - 1) * limit

    const [countRows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS total FROM products')
    const total = Number(countRows[0]?.total ?? 0)

    const [rows] = await pool.query<Product[]>(
      `SELECT id, name, description, price, category, image_url, video_url, stock_cargado, stock_disponible, created_at
       FROM products
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    )

    return sendSuccess(res, rows, total)
  } catch (error) {
    const { status, message } = listProductsErrorResponse(error)
    return sendError(res, message, status)
  }
}

export const createAdminProduct = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = validateCreate(req.body as ProductBody)
    if ('error' in parsed) {
      return sendError(res, String(parsed.error), 400)
    }
    const { name, description, category, price, image_url, video_url, stock_cargado, stock_disponible } =
      parsed.value

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO products (name, description, price, category, image_url, video_url, stock_cargado, stock_disponible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category, image_url, video_url, stock_cargado, stock_disponible],
    )

    const [rows] = await pool.query<Product[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [
      result.insertId,
    ])
    const product = rows[0]
    if (!product) {
      return sendError(res, 'No se pudo crear el producto', 500)
    }
    return sendSuccess(res, product, 1, 'Producto creado')
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo crear el producto', 500)
  }
}

export const updateAdminProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 'ID inválido', 400)
    }

    const parsed = validatePatch(req.body as ProductBody)
    if ('error' in parsed) {
      return sendError(res, String(parsed.error), 400)
    }

    const { updates, params } = parsed
    params.push(id)

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      params,
    )

    if (result.affectedRows === 0) {
      return sendError(res, 'Producto no encontrado', 404)
    }

    const [rows] = await pool.query<Product[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
    const product = rows[0]
    if (!product) {
      return sendError(res, 'Producto no encontrado', 404)
    }

    if (product.stock_disponible > product.stock_cargado) {
      await pool.query(
        'UPDATE products SET stock_disponible = stock_cargado WHERE id = ?',
        [id],
      )
      const [again] = await pool.query<Product[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
      const fixed = again[0]
      if (fixed) {
        return sendSuccess(res, fixed, 1, 'Producto actualizado (disponible igualado a lo cargado)')
      }
    }

    return sendSuccess(res, product, 1, 'Producto actualizado')
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo actualizar el producto', 500)
  }
}

/** Suma la misma cantidad a cargado y disponible (nueva mercadería sin cambiar lo ya vendido) */
export const ingresoMercaderia = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 'ID inválido', 400)
    }

    const cantidad = Math.floor(Number((req.body as { cantidad?: number }).cantidad))
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return sendError(res, 'Cantidad inválida (entero mayor a 0)', 400)
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products
       SET stock_cargado = stock_cargado + ?, stock_disponible = stock_disponible + ?
       WHERE id = ?`,
      [cantidad, cantidad, id],
    )

    if (result.affectedRows === 0) {
      return sendError(res, 'Producto no encontrado', 404)
    }

    const [rows] = await pool.query<Product[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
    const product = rows[0]
    if (!product) {
      return sendError(res, 'Producto no encontrado', 404)
    }
    return sendSuccess(res, product, 1, `Ingresaron ${cantidad} unidad(es)`)
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo registrar el ingreso', 500)
  }
}

export const deleteAdminProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 'ID inválido', 400)
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM products WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return sendError(res, 'Producto no encontrado', 404)
    }
    return sendSuccess(res, { id }, 1, 'Producto eliminado')
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo eliminar el producto', 500)
  }
}
