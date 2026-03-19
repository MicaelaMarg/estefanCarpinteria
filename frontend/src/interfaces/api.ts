export interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  total: number
  message: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
}
