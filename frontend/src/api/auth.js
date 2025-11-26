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

export const requestPasswordReset = async (email) => {
  const response = await api.post(`${AUTH_BASE}/password/reset-request`, { email })
  return response.data
}

export const resetPassword = async (email, token, password, password_confirmation) => {
  const response = await api.post(`${AUTH_BASE}/password/reset`, {
    email,
    token,
    password,
    password_confirmation,
  })
  return response.data
}

export const changePassword = async (currentPassword, password, passwordConfirmation) => {
  const response = await api.post(`${AUTH_BASE}/password/change`, {
    current_password: currentPassword,
    password,
    password_confirmation: passwordConfirmation,
  })
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get(`${AUTH_BASE}/me`)
  return response.data
}

export const fetch2faStatus = async () => {
  const response = await api.get(`${AUTH_BASE}/2fa`)
  return response.data
}

