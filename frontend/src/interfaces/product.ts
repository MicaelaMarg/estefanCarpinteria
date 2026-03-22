export interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string
  image_url: string
  video_url: string | null
  stock_cargado: number
  stock_disponible: number
  created_at: string
}

export interface ProductFilters {
  q: string
  category: string
  minPrice: number | null
  maxPrice: number | null
}
