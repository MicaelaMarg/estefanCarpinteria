import type { Request, Response } from 'express'
import type { PoolConnection } from 'mysql2/promise'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { env, toPublicAssetUrl } from '../config/env.js'
import { pool } from '../db/pool.js'
import { getShippingDeliveryPriceArs } from '../services/app-settings.service.js'
import { getPreferenceApi } from '../services/mercadopago.service.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { resolveMercadoPagoNotificationUrl } from '../utils/mpNotificationUrl.js'
import { unknownErrorMessage } from '../utils/unknownErrorMessage.js'

export type ShippingMode = 'pickup' | 'delivery'

function parseShippingMode(body: unknown): ShippingMode {
  if (!body || typeof body !== 'object') return 'pickup'
  const s = (body as { shipping?: unknown }).shipping
  if (s === 'delivery') return 'delivery'
  return 'pickup'
}

export const getShippingOptions = async (_req: Request, res: Response) => {
  const deliveryPrice = await getShippingDeliveryPriceArs()
  return sendSuccess(
    res,
    {
      modes: [
        {
          id: 'pickup' as const,
          label: 'Retiro en taller',
          price: 0,
          description: 'Coordinás la retirada cuando el pago esté acreditado.',
        },
        {
          id: 'delivery' as const,
          label: 'Envío a domicilio',
          price: deliveryPrice,
          description:
            'Costo fijo configurado por el taller; coordinamos fecha y dirección por WhatsApp.',
        },
      ],
    },
    2,
    '',
  )
}

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

function isMissingColumnError(e: unknown): boolean {
  const err = e as { errno?: number; code?: string }
  return err.errno === 1054 || err.code === 'ER_BAD_FIELD_ERROR'
}

interface ParsedShippingDetails {
  contactName: string | null
  phone: string | null
  address: string | null
  notes: string | null
}

function parseShippingDetails(body: unknown): ParsedShippingDetails {
  const empty: ParsedShippingDetails = {
    contactName: null,
    phone: null,
    address: null,
    notes: null,
  }
  if (!body || typeof body !== 'object') return empty
  const sd = (body as { shipping_details?: unknown }).shipping_details
  if (!sd || typeof sd !== 'object') return empty
  const o = sd as Record<string, unknown>
  const clip = (v: unknown, max: number): string | null => {
    const t = String(v ?? '').trim()
    if (!t) return null
    return t.slice(0, max)
  }
  return {
    contactName: clip(o.contact_name, 180),
    phone: clip(o.phone, 40),
    address: clip(o.address, 4000),
    notes: clip(o.notes, 500),
  }
}

function buildPreferenceAdditionalInfo(
  shippingMode: ShippingMode,
  d: ParsedShippingDetails,
): string | undefined {
  if (shippingMode !== 'delivery') return undefined
  const parts = [
    d.contactName ? `Nombre: ${d.contactName}` : null,
    d.phone ? `Tel: ${d.phone}` : null,
    d.address ? `Envío: ${d.address}` : null,
    d.notes ? `Notas: ${d.notes}` : null,
  ].filter(Boolean) as string[]
  if (parts.length === 0) return undefined
  const s = parts.join(' | ')
  return s.length > 500 ? `${s.slice(0, 497)}…` : s
}

/** Inserta pedido pending; reintenta con menos columnas si faltan migraciones 006/007. */
async function insertPendingOrder(
  conn: PoolConnection,
  params: {
    totalAmount: number
    shippingMode: ShippingMode
    shippingCost: number
    details: ParsedShippingDetails
  },
): Promise<number> {
  const { totalAmount, shippingMode, shippingCost, details } = params
  const t = totalAmount.toFixed(2)
  const sc = shippingCost.toFixed(2)
  const { contactName, phone, address, notes } = details

  const attempts: { sql: string; args: Array<string | null> }[] = [
    {
      sql: `INSERT INTO orders (status, total_amount, currency_id, shipping_method, shipping_cost, shipping_contact_name, shipping_phone, shipping_address, shipping_notes)
            VALUES ('pending', ?, 'ARS', ?, ?, ?, ?, ?, ?)`,
      args: [t, shippingMode, sc, contactName, phone, address, notes],
    },
    {
      sql: `INSERT INTO orders (status, total_amount, currency_id, shipping_method, shipping_cost) VALUES ('pending', ?, 'ARS', ?, ?)`,
      args: [t, shippingMode, sc],
    },
    {
      sql: `INSERT INTO orders (status, total_amount, currency_id) VALUES ('pending', ?, 'ARS')`,
      args: [t],
    },
  ]

  let lastErr: unknown
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i]!
    try {
      const [r] = (await conn.query(a.sql, a.args)) as [ResultSetHeader, unknown]
      if (i > 0) {
        console.warn(
          `[checkout] INSERT orders nivel ${i + 1}/${attempts.length}; corré migraciones 006/007 para datos de envío completos`,
        )
      }
      return r.insertId
    } catch (e) {
      if (!isMissingColumnError(e)) throw e
      lastErr = e
    }
  }
  throw lastErr
}

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

  if (env.isRailway && /localhost|127\.0\.0\.1/i.test(env.publicFrontendUrl)) {
    console.error('[checkout] publicFrontendUrl inválido en Railway:', env.publicFrontendUrl)
    return sendError(
      res,
      'Configurá PUBLIC_FRONTEND_URL o CORS_ORIGIN con la URL HTTPS del frontend. Mercado Pago rechaza localhost en back_urls.',
      503,
    )
  }

  const parsed = parseCartItems(req.body)
  if (!parsed) {
    return sendError(
      res,
      'Carrito inválido: items, shipping y si es delivery shipping_details (teléfono y dirección)',
      400,
    )
  }

  const shippingMode = parseShippingMode(req.body)
  const shippingDetails = parseShippingDetails(req.body)

  if (shippingMode === 'delivery') {
    if (!shippingDetails.phone || shippingDetails.phone.replace(/\D/g, '').length < 6) {
      return sendError(res, 'Para envío a domicilio indicá un teléfono de contacto válido', 400)
    }
    if (!shippingDetails.address || shippingDetails.address.length < 8) {
      return sendError(res, 'Para envío a domicilio indicá la dirección completa (calle, número, localidad)', 400)
    }
  }

  const configuredShip = shippingMode === 'delivery' ? await getShippingDeliveryPriceArs() : 0
  const shippingCost = Number.isFinite(configuredShip) && configuredShip >= 0 ? configuredShip : 0

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

    totalAmount += shippingCost

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      await conn.rollback()
      return sendError(res, 'Total del pedido inválido', 500)
    }

    const orderId = await insertPendingOrder(conn, {
      totalAmount,
      shippingMode,
      shippingCost,
      details: shippingDetails,
    })

    for (const line of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, title)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.quantity, line.unitPrice.toFixed(2), line.title],
      )
    }

    await conn.commit()

    const base = env.publicFrontendUrl
    const notificationUrl = resolveMercadoPagoNotificationUrl({
      explicitUrl: env.mercadopagoNotificationUrl,
      publicBaseUrl: env.publicBaseUrl,
      sendInPreference: env.mercadopagoSendNotificationUrl,
    })
    if (!notificationUrl && !env.mercadopagoSendNotificationUrl && !env.mercadopagoNotificationUrl) {
      console.log(
        '[checkout] notification_url no va en la preferencia; MP usará la URL de Webhooks del panel Developers',
      )
    }

    const preferenceApi = getPreferenceApi()
    let preferenceId: string | undefined
    let initPoint: string | undefined

    try {
      const mpItems = lines.map((line) => ({
        id: String(line.productId),
        title: line.title,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        currency_id: 'ARS',
        ...(line.picture ? { picture_url: line.picture } : {}),
      }))

      if (shippingCost > 0) {
        mpItems.push({
          id: 'ENVIO',
          title: 'Envío a domicilio',
          quantity: 1,
          unit_price: shippingCost,
          currency_id: 'ARS',
        })
      }

      const additionalInfo = buildPreferenceAdditionalInfo(shippingMode, shippingDetails)

      const pref = await preferenceApi.create({
        body: {
          items: mpItems,
          ...(additionalInfo ? { additional_info: additionalInfo } : {}),
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
      const detail = unknownErrorMessage(e, 'revisá credenciales y datos del pedido')
      return sendError(res, `No se pudo iniciar el pago: ${detail}`, 502)
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
    const err = e as { errno?: number; code?: string; sqlMessage?: string }
    console.error('[checkout]', err.code, err.errno, err.sqlMessage ?? e)
    if (isMissingColumnError(e)) {
      return sendError(
        res,
        'Falta migración SQL: ejecutá backend/sql/migrations/006_order_shipping.sql en MySQL.',
        503,
      )
    }
    return sendError(res, 'Error al crear el pedido', 500)
  } finally {
    conn.release()
  }
}
