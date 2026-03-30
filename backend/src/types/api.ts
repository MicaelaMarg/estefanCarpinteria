import type { RowDataPacket } from 'mysql2'

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  total: number
  message: string
}

export interface Product extends RowDataPacket {
  id: number
  name: string
  description: string
  price: number
  category: string
  image_url: string
  video_url: string | null
  stock_cargado: number
  stock_disponible: number
  shipping_weight_g: number
  shipping_length_cm: number
  shipping_width_cm: number
  shipping_height_cm: number
  created_at: Date
}
