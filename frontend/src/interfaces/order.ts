export interface AdminOrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  title: string
}

export interface AdminOrder {
  id: number
  status: string
  total_amount: number
  currency_id: string
  preference_id: string | null
  payment_id: string | null
  shipping_method: string | null
  shipping_cost: number | null
  shipping_contact_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  shipping_notes: string | null
  created_at: string
  updated_at: string
  items: AdminOrderItem[]
}
