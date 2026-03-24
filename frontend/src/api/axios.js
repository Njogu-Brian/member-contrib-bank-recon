// /src/api/axios.js
import axios from 'axios'

/**
 * VITE_API_BASE_URL should end with /api/v1 (e.g. https://domain.com/api/v1).
 * Paths passed to axios must NOT include /api/v1 again (use /admin/..., /auth/..., /public/...).
 */
export function getApiBaseUrl() {
  const env = import.meta.env.VITE_API_BASE_URL
  if (!env || env === '') {
    return 'http://localhost:8000/api/v1'
  }
  const trimmed = env.replace(/\/$/, '')
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`
}

const API_BASE = getApiBaseUrl()

// Create the main axios instance (token-based auth)
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json',
  },
})

// Load token from localStorage and set Authorization header on initialization
const token = localStorage.getItem('auth_token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Request interceptor: handle FormData & auth token
api.interceptors.request.use((config) => {
  // If data is FormData, remove Content-Type so browser adds boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
    delete config.headers.common?.['Content-Type']
    delete config.headers.post?.['Content-Type']
    delete config.headers.put?.['Content-Type']
  }

  // Attach token if available (may have been loaded from localStorage or set by login)
  const authToken = localStorage.getItem('auth_token')
  if (authToken && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${authToken}`
  }

  return config
})

// Response interceptor: handle 401 errors and clear invalid tokens
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (err.response?.status === 401) {
      // Clear token and redirect to login (except if already on login page)
      const token = localStorage.getItem('auth_token')
      if (token) {
        localStorage.removeItem('auth_token')
        delete api.defaults.headers.common['Authorization']
        
        // Only redirect if not already on login or public routes
        const currentPath = window.location.pathname
        if (!currentPath.startsWith('/login') && 
            !currentPath.startsWith('/s/') && 
            !currentPath.startsWith('/public/')) {
          // Clear query cache to force re-fetch on next login
          window.location.href = '/login'
        }
      }
    }
    
    // suppress logging for expected auth checks if you like,
    // but log useful info for debugging
    console.error('API error', {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      data: err.response?.data,
    })
    return Promise.reject(err)
  }
)

/**
 * Admin routes under baseURL (/api/v1). Returns "/admin/<path>" only.
 */
const withAdminPrefix = (path = '') => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/admin/${cleanPath}`.replace(/\/+$/, '').replace(/\/{2,}/g, '/')
}

// Named export: adminApi — simple wrapper around `api` with admin prefix
export const adminApi = {
  get: (path = '', config) => api.get(withAdminPrefix(path), config),
  post: (path = '', data, config) => api.post(withAdminPrefix(path), data, config),
  put: (path = '', data, config) => api.put(withAdminPrefix(path), data, config),
  patch: (path = '', data, config) => api.patch(withAdminPrefix(path), data, config),
  delete: (path = '', config) => api.delete(withAdminPrefix(path), config),
}

// Default export: generic api instance
export default api
