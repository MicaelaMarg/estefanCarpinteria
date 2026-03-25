import type { OrderFulfillmentStatus } from './order'

export interface AdminDashboardStats {
  total_orders: number
  orders_pending: number
  orders_paid: number
  orders_failed: number
  revenue_paid: number
  revenue_month_paid: number
  fulfillment_breakdown: Record<OrderFulfillmentStatus, number>
}
