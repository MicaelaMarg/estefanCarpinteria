import type { Request, Response } from 'express'
import type { PoolConnection } from 'mysql2/promise'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { env, toPublicAssetUrl } from '../config/env.js'
import { pool } from '../db/pool.js'
import {
  getShippingCorreoArgentinoPriceArs,
  getShippingDeliveryPriceArs,
} from '../services/app-settings.service.js'
import { isPaqArConfigured } from '../services/paqar.service.js'
import { getPreferenceApi } from '../services/mercadopago.service.js'
import { buildParcelMetrics } from '../utils/parcelMetrics.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { resolveMercadoPagoNotificationUrl } from '../utils/mpNotificationUrl.js'
import { unknownErrorMessage } from '../utils/unknownErrorMessage.js'

export type ShippingMode = 'pickup' | 'delivery' | 'correo_argentino'

function parseShippingMode(body: unknown): ShippingMode {
  if (!body || typeof body !== 'object') return 'pickup'
  const s = (body as { shipping?: unknown }).shipping
  if (s === 'delivery') return 'delivery'
  if (s === 'correo_argentino') return 'correo_argentino'
  return 'pickup'
}

function needsShippingContactDetails(mode: ShippingMode): boolean {
  return mode === 'delivery' || mode === 'correo_argentino'
}

export const getShippingOptions = async (_req: Request, res: Response) => {
  const [deliveryPrice, correoPrice] = await Promise.all([
    getShippingDeliveryPriceArs(),
    getShippingCorreoArgentinoPriceArs(),
  ])
  const correoDescription = isPaqArConfigured()
    ? 'Usamos un precio fijo en la tienda y después gestionamos el despacho por PAQ.AR con los datos del pedido.'
    : 'Usamos un precio fijo configurable y gestionamos el despacho manualmente desde Correo Argentino.'
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
        {
          id: 'correo_argentino' as const,
          label: 'Correo Argentino',
          price: correoPrice,
          description: correoDescription,
        },
      ],
    },
    3,
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
  shipping_weight_g: number
  shipping_length_cm: number
  shipping_width_cm: number
  shipping_height_cm: number
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
  postalCode: string | null
}

function parseShippingDetails(body: unknown): ParsedShippingDetails {
  const empty: ParsedShippingDetails = {
    contactName: null,
    phone: null,
    address: null,
    notes: null,
    postalCode: null,
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
    postalCode: clip(o.postal_code, 20)?.toUpperCase().replace(/\s+/g, '') ?? null,
  }
}

function buildPreferenceAdditionalInfo(
  shippingMode: ShippingMode,
  d: ParsedShippingDetails,
): string | undefined {
  if (!needsShippingContactDetails(shippingMode)) return undefined
  const tipo = shippingMode === 'correo_argentino' ? 'Correo Argentino' : 'Envío a domicilio'
  const parts = [
    `Tipo: ${tipo}`,
    d.contactName ? `Nombre: ${d.contactName}` : null,
    d.phone ? `Tel: ${d.phone}` : null,
    d.address ? `Envío: ${d.address}` : null,
    d.postalCode ? `CP: ${d.postalCode}` : null,
    d.notes ? `Notas: ${d.notes}` : null,
  ].filter(Boolean) as string[]
  if (parts.length === 0) return undefined
  const s = parts.join(' | ')
  return s.length > 500 ? `${s.slice(0, 497)}…` : s
}

/** Inserta pedido pending; reintenta con menos columnas si faltan migraciones 006/007/012. */
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
  const { contactName, phone, address, notes, postalCode } = details

  const attempts: { sql: string; args: Array<string | null> }[] = [
    {
      sql: `INSERT INTO orders (status, total_amount, currency_id, shipping_method, shipping_cost, shipping_contact_name, shipping_phone, shipping_address, shipping_notes, shipping_postal_code)
            VALUES ('pending', ?, 'ARS', ?, ?, ?, ?, ?, ?, ?)`,
      args: [t, shippingMode, sc, contactName, phone, address, notes, postalCode],
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
          `[checkout] INSERT orders nivel ${i + 1}/${attempts.length}; corré migraciones 006/007/012 para datos de envío completos`,
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

async function loadCheckoutProducts(uniqueIds: number[]): Promise<ProductRow[]> {
  const placeholders = uniqueIds.map(() => '?').join(',')
  const sql = `
    SELECT id, name, price, stock_disponible, image_url, shipping_weight_g, shipping_length_cm, shipping_width_cm, shipping_height_cm
    FROM products
    WHERE id IN (${placeholders})
  `
  const [rows] = await pool.query<ProductRow[]>(sql, uniqueIds)
  return rows
}

async function buildQuoteParcel(linesInput: { id: number; quantity: number }[]) {
  const uniqueIds = linesInput.map((line) => line.id)
  const productRows = await loadCheckoutProducts(uniqueIds)
  if (productRows.length !== uniqueIds.length) {
    throw new Error('No pudimos leer uno o más productos del carrito')
  }

  const byId = new Map(productRows.map((row) => [row.id, row]))
  return buildParcelMetrics(
    linesInput.map((line) => {
      const product = byId.get(line.id)
      if (!product) {
        throw new Error('Producto no encontrado para preparar el envío')
      }
      return {
        quantity: line.quantity,
        shipping_weight_g: product.shipping_weight_g,
        shipping_height_cm: product.shipping_height_cm,
        shipping_width_cm: product.shipping_width_cm,
        shipping_length_cm: product.shipping_length_cm,
      }
    }),
  )
}

export const postShippingQuote = async (req: Request, res: Response) => {
  const parsed = parseCartItems(req.body)
  if (!parsed) {
    return sendError(res, 'Carrito inválido para preparar envío', 400)
  }

  const shippingDetails = parseShippingDetails(req.body)
  if (!shippingDetails.postalCode) {
    return sendError(res, 'Ingresá un código postal para continuar', 400)
  }

  try {
    const fallbackPrice = await getShippingCorreoArgentinoPriceArs()
    const parcel = await buildQuoteParcel(parsed)
    return sendSuccess(
      res,
      {
        source: 'fallback',
        valid_to: null,
        selected_rate: {
          delivered_type: 'D',
          product_type: 'MANUAL',
          product_name: 'Correo Argentino (precio fijo)',
          price: fallbackPrice,
          delivery_time_min: '',
          delivery_time_max: '',
        },
        rates: [],
        parcel,
      },
      1,
      isPaqArConfigured()
        ? 'La API oficial de PAQ.AR no publica cotización en este flujo; usamos el precio fijo configurado.'
        : 'PAQ.AR no está configurado; usamos el precio fijo actual.',
    )
  } catch (e) {
    return sendError(res, unknownErrorMessage(e, 'No se pudo preparar el envío'), 502)
  }
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
      'Carrito inválido: items, shipping y si hay envío shipping_details (teléfono y dirección)',
      400,
    )
  }

  const shippingMode = parseShippingMode(req.body)
  const shippingDetails = parseShippingDetails(req.body)

  if (needsShippingContactDetails(shippingMode)) {
    if (!shippingDetails.phone || shippingDetails.phone.replace(/\D/g, '').length < 6) {
      return sendError(res, 'Para este envío indicá un teléfono de contacto válido', 400)
    }
    if (!shippingDetails.address || shippingDetails.address.length < 8) {
      return sendError(
        res,
        'Indicá la dirección completa (calle, número, CP y localidad). Para Correo Argentino el CP es obligatorio.',
        400,
      )
    }
    if (shippingMode === 'correo_argentino' && !shippingDetails.postalCode) {
      return sendError(res, 'Para Correo Argentino indicá un código postal válido', 400)
    }
  }

  let configuredShip = 0
  if (shippingMode === 'delivery') {
    configuredShip = await getShippingDeliveryPriceArs()
  } else if (shippingMode === 'correo_argentino') {
    configuredShip = await getShippingCorreoArgentinoPriceArs()
  }
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
      `SELECT id, name, price, stock_disponible, image_url, shipping_weight_g, shipping_length_cm, shipping_width_cm, shipping_height_cm
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
        const correo = shippingMode === 'correo_argentino'
        mpItems.push({
          id: correo ? 'ENVIO_CORREO' : 'ENVIO_DOMICILIO',
          title: correo ? 'Envío Correo Argentino' : 'Envío a domicilio',
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
