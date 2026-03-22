import type { Response } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { pool } from '../db/pool.js'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import type { Product } from '../types/api.js'
import { sendError, sendSuccess } from '../utils/response.js'

interface CountRow extends RowDataPacket {
  total: number
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

  return {
    value: { name, description, category, price, image_url, video_url },
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

  if (updates.length === 0) {
    return { error: 'Nada que actualizar' as const }
  }

  return { updates, params }
}

export const listAdminProducts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parsePositiveNumber(req.query.page, 1)
    const limit = Math.min(parsePositiveNumber(req.query.limit, 100), 500)
    const offset = (page - 1) * limit

    const [countRows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS total FROM products')
    const total = Number(countRows[0]?.total ?? 0)

    const [rows] = await pool.query<Product[]>(
      `SELECT id, name, description, price, category, image_url, video_url, created_at
       FROM products
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    )

    return sendSuccess(res, rows, total)
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudieron listar los productos', 500)
  }
}

export const createAdminProduct = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = validateCreate(req.body as ProductBody)
    if ('error' in parsed) {
      return sendError(res, String(parsed.error), 400)
    }
    const { name, description, category, price, image_url, video_url } = parsed.value

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO products (name, description, price, category, image_url, video_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, price, category, image_url, video_url],
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
    return sendSuccess(res, product, 1, 'Producto actualizado')
  } catch (error) {
    console.error(error)
    return sendError(res, 'No se pudo actualizar el producto', 500)
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
