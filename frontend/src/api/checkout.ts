import configApi from './configApi'

export type ShippingMode = 'pickup' | 'delivery' | 'correo_argentino'

export interface ShippingModeOption {
  id: ShippingMode
  label: string
  price: number
  description: string
}

export interface ShippingOptionsPayload {
  modes: ShippingModeOption[]
}

export interface CheckoutResponse {
  init_point: string
  preference_id: string
  order_id: number
}

export interface ShippingQuoteRate {
  id: string
  delivered_type: string
  product_type: string
  product_name: string
  price: number
  delivery_time_min: string
  delivery_time_max: string
}

export interface ShippingQuoteResponse {
  source: 'fallback' | 'micorreo'
  valid_to: string | null
  selected_rate: ShippingQuoteRate
  rates: ShippingQuoteRate[]
  parcel: {
    weightG: number
    heightCm: number
    widthCm: number
    lengthCm: number
  }
}

/** Datos que el cliente completa si elige envío a domicilio */
export interface ShippingDetailsPayload {
  contact_name?: string
  phone?: string
  address?: string
  notes?: string
  postal_code?: string
  quote_rate?: {
    rate_id?: string
    delivered_type?: string
    product_type?: string
    product_name?: string
  }
}

export async function getShippingOptions(): Promise<ShippingOptionsPayload> {
  const { data } = await configApi.get<{ data: ShippingOptionsPayload }>('/checkout/shipping')
  return data.data
}

export async function postCheckout(
  items: { id: number; quantity: number }[],
  shipping: ShippingMode = 'pickup',
  shipping_details?: ShippingDetailsPayload,
): Promise<CheckoutResponse> {
  const body: Record<string, unknown> = { items, shipping }
  if (shipping_details && Object.keys(shipping_details).length > 0) {
    body.shipping_details = shipping_details
  }
  const { data } = await configApi.post<{ data: CheckoutResponse }>('/checkout', body)
  return data.data
}

export async function getShippingQuote(
  items: { id: number; quantity: number }[],
  shipping_details: ShippingDetailsPayload,
): Promise<ShippingQuoteResponse> {
  const { data } = await configApi.post<{ data: ShippingQuoteResponse }>('/checkout/shipping/quote', {
    items,
    shipping_details,
  })
  return data.data
}
