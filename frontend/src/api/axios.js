import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    // Don't set Content-Type by default - let axios set it based on data type
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // If data is FormData, don't set Content-Type - let browser set it with boundary
  // This MUST be done to ensure proper multipart/form-data encoding
  if (config.data instanceof FormData) {
    // Remove Content-Type completely - axios will set it correctly for FormData
    delete config.headers['Content-Type']
    delete config.headers.common?.['Content-Type']
    delete config.headers.post?.['Content-Type']
    delete config.headers.put?.['Content-Type']
    
    // Log to verify FormData is being sent
    console.log('Sending FormData, Content-Type removed')
  }
  
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    // Don't redirect to login for public routes (like /s/:token)
    const isPublicRoute = window.location.pathname.startsWith('/s/') || 
                         window.location.pathname.startsWith('/public/') ||
                         window.location.pathname === '/login'
    
    if (status === 401 || status === 419) {
      // Only remove token and redirect if NOT on a public route
      if (!isPublicRoute) {
        localStorage.removeItem('token')
        // Only redirect to login if not already on a public route
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      // For public routes, just reject the error without redirecting
    }
    return Promise.reject(error)
  }
)

const withAdminPrefix = (path = '') => {
  // Remove leading slash for consistency
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  // Routes under /v1/admin/admin/* need double admin prefix
  // So 'roles' becomes '/admin/admin/roles'
  // So 'staff' becomes '/admin/admin/staff'
  return `/admin/admin/${cleanPath}`
}

export const adminApi = {
  get: (path, config) => api.get(withAdminPrefix(path), config),
  post: (path, data, config) => api.post(withAdminPrefix(path), data, config),
  put: (path, data, config) => api.put(withAdminPrefix(path), data, config),
  patch: (path, data, config) => api.patch(withAdminPrefix(path), data, config),
  delete: (path, config) => api.delete(withAdminPrefix(path), config),
}

export default api

