import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 419) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

const withAdminPrefix = (path = '') => {
  if (path.startsWith('/admin/')) return path
  if (path === '/admin') return path
  return `/admin${path}`
}

export const adminApi = {
  get: (path, config) => api.get(withAdminPrefix(path), config),
  post: (path, data, config) => api.post(withAdminPrefix(path), data, config),
  put: (path, data, config) => api.put(withAdminPrefix(path), data, config),
  patch: (path, data, config) => api.patch(withAdminPrefix(path), data, config),
  delete: (path, config) => api.delete(withAdminPrefix(path), config),
}

export default api

