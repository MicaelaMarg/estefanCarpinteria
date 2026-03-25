import configApi from './configApi'

export type ShippingMode = 'pickup' | 'delivery'

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

/** Datos que el cliente completa si elige envío a domicilio */
export interface ShippingDetailsPayload {
  contact_name?: string
  phone?: string
  address?: string
  notes?: string
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
