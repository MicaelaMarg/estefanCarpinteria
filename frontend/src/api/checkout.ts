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

export async function getShippingOptions(): Promise<ShippingOptionsPayload> {
  const { data } = await configApi.get<{ data: ShippingOptionsPayload }>('/checkout/shipping')
  return data.data
}

export async function postCheckout(
  items: { id: number; quantity: number }[],
  shipping: ShippingMode = 'pickup',
): Promise<CheckoutResponse> {
  const { data } = await configApi.post<{ data: CheckoutResponse }>('/checkout', { items, shipping })
  return data.data
}
