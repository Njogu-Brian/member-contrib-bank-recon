import api from './axios'

const AUTH_BASE = '/auth'

export const login = async (email, password) => {
  const response = await api.post(`${AUTH_BASE}/login`, { email, password })
  const token = response.data?.token
  if (token) {
    localStorage.setItem('token', token)
  }
  return response.data
}

export const logout = async () => {
  await api.post(`${AUTH_BASE}/logout`)
  localStorage.removeItem('token')
}

export const getCurrentUser = async () => {
  const response = await api.get(`${AUTH_BASE}/me`)
  return response.data
}

export const fetch2faStatus = async () => {
  const response = await api.get(`${AUTH_BASE}/2fa`)
  return response.data
}

