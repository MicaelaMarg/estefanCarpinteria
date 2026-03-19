import { computed, ref } from 'vue'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'
import type { AuthData, LoginPayload } from '../interfaces/auth'

const token = ref<string | null>(localStorage.getItem('token'))
const currentUser = ref<AuthData['user'] | null>(
  localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') ?? '{}') : null,
)
const loading = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(token.value))

  const login = async (payload: LoginPayload) => {
    loading.value = true

    try {
      const { data } = await configApi.post<ApiResponse<AuthData>>('/auth/login', payload)
      token.value = data.data.token
      currentUser.value = data.data.user
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = null
    currentUser.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    currentUser,
    loading,
    isAuthenticated,
    login,
    logout,
  }
}
