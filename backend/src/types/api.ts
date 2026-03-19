export interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  total: number
  message: string
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string
  image_url: string
  video_url: string | null
  created_at: Date
}
