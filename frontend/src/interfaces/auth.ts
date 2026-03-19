export interface LoginPayload {
  email: string
  password: string
}

export interface AuthData {
  token: string
  user: {
    id: number
    email: string
    name: string
  }
}
