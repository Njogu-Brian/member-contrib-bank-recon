// src/api/auth.js — Token-based authentication
import api from './axios'

// Axios baseURL is already set to VITE_API_BASE_URL (e.g. .../api/v1), so auth paths are relative to that
const AUTH_BASE = '/auth'

/**
 * Perform login:
 * POST credentials to login endpoint (backend returns token)
 * Token is stored in localStorage and added to Authorization header
 */
export async function login(email, password) {
  // POST login - backend returns token
  const res = await api.post(`${AUTH_BASE}/login`, { email, password })

  // Store token in localStorage for subsequent requests
  if (res.data?.token) {
    localStorage.setItem('auth_token', res.data.token)
    // Update axios default header to include token
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
  }

  // Store client state
  sessionStorage.setItem('session_active', 'true')
  sessionStorage.setItem('last_login_at', String(Date.now()))

  return res.data
}

export async function logout() {
  // Call server logout to revoke token
  try {
    await api.post(`${AUTH_BASE}/logout`)
  } catch (error) {
    // Even if logout fails, clear local storage
    console.warn('Logout request failed:', error)
  }
  
  // Clear token and client-side indicators
  localStorage.removeItem('auth_token')
  delete api.defaults.headers.common['Authorization']
  sessionStorage.removeItem('session_active')
  sessionStorage.removeItem('last_login_at')
}

export async function requestPasswordReset(email) {
  const res = await api.post(`${AUTH_BASE}/password/reset-request`, { email })
  return res.data
}

export async function resetPassword(email, token, password, password_confirmation) {
  const res = await api.post(`${AUTH_BASE}/password/reset`, {
    email,
    token,
    password,
    password_confirmation,
  })
  return res.data
}

export async function changePassword(currentPassword, password, passwordConfirmation) {
  const payload = {
    password,
    password_confirmation: passwordConfirmation,
  }
  if (currentPassword && currentPassword.trim() !== '') {
    payload.current_password = currentPassword
  }
  const res = await api.post(`${AUTH_BASE}/password/change`, payload)
  return res.data
}

export async function getCurrentUser() {
  // make sure this route matches your backend route - many apps use /api/v1/auth/me
  const res = await api.get(`${AUTH_BASE}/me`)
  return res.data
}

export async function fetch2faStatus() {
  const res = await api.get(`${AUTH_BASE}/2fa`)
  return res.data
}
