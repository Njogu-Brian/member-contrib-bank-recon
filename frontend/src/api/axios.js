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
  // Check if this is a public route - don't add auth token for public routes
  const isPublicRoute = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/s/') || 
     window.location.pathname.startsWith('/public/'))
  
  // Only add auth token if NOT a public route
  if (!isPublicRoute) {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  
  // If data is FormData, don't set Content-Type - let browser set it with boundary
  // This MUST be done to ensure proper multipart/form-data encoding
  if (config.data instanceof FormData) {
    // Remove Content-Type completely - axios will set it correctly for FormData
    delete config.headers['Content-Type']
    delete config.headers.common?.['Content-Type']
    delete config.headers.post?.['Content-Type']
    delete config.headers.put?.['Content-Type']
    
    // FormData detected - Content-Type will be set by browser with boundary
  }
  
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const config = error.config
    
    // Don't redirect to login for public routes (like /s/:token)
    const isPublicRoute = window.location.pathname.startsWith('/s/') || 
                         window.location.pathname.startsWith('/public/') ||
                         window.location.pathname === '/login' ||
                         window.location.pathname === '/change-password' ||
                         window.location.pathname === '/forgot-password' ||
                         window.location.pathname === '/reset-password'
    
    if (status === 401 || status === 419) {
      // 401 is expected on login/change-password pages when checking auth status
      // Don't log it as an error or redirect if we're on these pages
      if (isPublicRoute || window.location.pathname === '/login' || window.location.pathname === '/change-password') {
        // Silently handle 401 on login/change-password pages - it's expected
        // Just reject the promise without logging or redirecting
        return Promise.reject(error)
      }
      
      // Only remove token and redirect if NOT on a public route or auth pages
      if (!isPublicRoute) {
        // Check if this is a session expiration message (not a general auth error)
        const errorMessage = error.response?.data?.message || ''
        const isSessionExpired = errorMessage.includes('session has expired') || 
                                errorMessage.includes('inactivity') ||
                                errorMessage.includes('expired') ||
                                errorMessage.includes('Unauthenticated')
        
        // Check if this is a user-initiated action (not a background refetch)
        const isUserAction = ['post', 'put', 'delete', 'patch'].includes(config?.method?.toLowerCase() || '')
        
        // IMPORTANT: Don't logout on GET requests (refetches) unless it's explicitly a session expiration
        // This prevents logout when React Query refetches data after a mutation
        if (isSessionExpired) {
          // Definite session expiration - logout immediately
          localStorage.removeItem('token')
          localStorage.removeItem('token_timestamp')
          sessionStorage.removeItem('session_active')
          if (window.location.pathname !== '/login' && 
              window.location.pathname !== '/change-password' &&
              window.location.pathname !== '/forgot-password' &&
              window.location.pathname !== '/reset-password') {
            window.location.href = '/login'
          }
        } else if (isUserAction) {
          // User-initiated action failed with 401 - this is a real auth issue
          // But give a more graceful error message instead of immediate logout
          // Don't logout on POST/PUT/DELETE requests that might be transient errors
          // Only logout if we get multiple failures in quick succession
          console.error('Authentication failed for user action:', errorMessage)
          
          // Check if this is a pending profile changes approval endpoint
          // These endpoints should not cause logout on 401 (might be session timeout during approval)
          const isPendingChangesEndpoint = config?.url?.includes('/pending-profile-changes')
          
          if (!isPendingChangesEndpoint) {
            // Only logout if this is NOT the first failure
            const failureCount = parseInt(sessionStorage.getItem('auth_failure_count') || '0')
            if (failureCount > 0) {
              // Second failure - logout
              localStorage.removeItem('token')
              localStorage.removeItem('token_timestamp')
              sessionStorage.removeItem('session_active')
              sessionStorage.removeItem('auth_failure_count')
              if (window.location.pathname !== '/login') {
                window.location.href = '/login'
              }
            } else {
              // First failure - just track it
              sessionStorage.setItem('auth_failure_count', '1')
              // Clear the count after 5 seconds (transient error recovery)
              setTimeout(() => sessionStorage.removeItem('auth_failure_count'), 5000)
            }
          } else {
            // For pending changes endpoints, just reject without logging out
            // The user can refresh and try again
            console.warn('Authentication error on pending changes action:', errorMessage)
            return Promise.reject(error)
          }
        } else {
          // GET request with 401 - just log and reject, don't logout
          console.warn('Authentication error on background request:', errorMessage)
          return Promise.reject(error)
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

