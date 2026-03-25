import configApi from './configApi'

export interface CheckoutResponse {
  init_point: string
  preference_id: string
  order_id: number
}

export async function postCheckout(items: { id: number; quantity: number }[]): Promise<CheckoutResponse> {
  const { data } = await configApi.post<{ data: CheckoutResponse }>('/checkout', { items })
  return data.data
}
