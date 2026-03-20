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
    const message = error.response?.data?.message ?? 'Ocurrio un error inesperado'
    toast.error(message)
    return Promise.reject(error)
  },
)

export default configApi