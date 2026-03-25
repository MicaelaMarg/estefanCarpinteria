import axios from 'axios'
import { toast } from 'vue3-toastify'

const configApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  timeout: 15000,
})

configApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

configApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = String(error.config?.url ?? '')
    const isLoginPost = url.includes('/auth/login') && error.config?.method?.toLowerCase() === 'post'

    if (status === 401 && !isLoginPost) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      toast.error('Sesión expirada o no válida. Iniciá sesión de nuevo.')
      if (!window.location.pathname.startsWith('/login')) {
        const back = `${window.location.pathname}${window.location.search}`
        window.location.assign(`/login?redirect=${encodeURIComponent(back)}`)
      }
      return Promise.reject(error)
    }

    const raw = error.response?.data?.message
    const message =
      typeof raw === 'string'
        ? raw
        : raw != null && typeof raw === 'object'
          ? (() => {
              try {
                const s = JSON.stringify(raw)
                return s.length > 280 ? `${s.slice(0, 280)}…` : s
              } catch {
                return 'Ocurrio un error inesperado'
              }
            })()
          : 'Ocurrio un error inesperado'
    toast.error(message)
    return Promise.reject(error)
  },
)

export default configApi