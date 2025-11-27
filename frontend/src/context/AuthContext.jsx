import { createContext, useContext, useMemo, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentUser, logout as apiLogout } from '../api/auth'

const AuthContext = createContext({
  user: null,
  roles: [],
  isLoading: true,
  isAuthenticated: false,
  error: null,
  logout: async () => {},
  refetch: async () => {},
})

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const routerLocation = useLocation()
  
  // Get pathname from window.location first (available immediately)
  // This is critical - we need to check this BEFORE React Router initializes
  const getInitialPathname = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return ''
  }
  
  const [pathname, setPathname] = useState(getInitialPathname)
  
  // Update pathname when React Router location changes
  useEffect(() => {
    if (routerLocation?.pathname) {
      setPathname(routerLocation.pathname)
    }
  }, [routerLocation?.pathname])
  
  // Skip auth check for public statement routes only
  // Login/logout routes still need auth context but don't require authentication
  // Use useMemo to ensure this is calculated before the query runs
  // Check window.location directly to avoid any React Router timing issues
  const isPublicStatementRoute = useMemo(() => {
    // Always check window.location first (most reliable)
    const currentPath = typeof window !== 'undefined' 
      ? window.location.pathname 
      : (pathname || getInitialPathname())
    
    // Only /s/ and /public/ are true public routes that bypass auth
    const isPublic = currentPath.startsWith('/s/') || 
                     currentPath.startsWith('/public/')
    
    return isPublic
  }, [pathname])

  // For public statement routes, completely skip the auth query
  // Login/logout routes still need auth context but don't require authentication
  // Use a conditional query that only runs for non-public-statement routes
  const authQuery = useQuery({
    queryKey: ['auth', 'user', isPublicStatementRoute ? 'public' : 'private'],
    queryFn: async () => {
      try {
        return await getCurrentUser()
      } catch (error) {
        // If 401 (Unauthenticated), that's expected on login page - return null
        if (error.response?.status === 401 || error.status === 401) {
          return null
        }
        // For other errors, rethrow
        throw error
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !isPublicStatementRoute, // Don't check auth for public statement routes
    // Ensure query doesn't run if disabled
    refetchOnMount: !isPublicStatementRoute,
    refetchOnWindowFocus: !isPublicStatementRoute,
    // Don't use cached data for public statement routes
    gcTime: isPublicStatementRoute ? 0 : 5 * 60 * 1000,
    // For public statement routes, return immediately without making the request
    ...(isPublicStatementRoute && {
      queryFn: () => Promise.resolve(null),
      initialData: null,
    }),
  })

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: refetchUser,
  } = authQuery

  const resolvedUser = data?.user ?? data ?? null
  const roles = resolvedUser?.roles ?? []

  const handleLogout = async () => {
    await apiLogout()
    await queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
    window.location.href = '/login'
  }

  const value = useMemo(
    () => ({
      user: resolvedUser,
      roles,
      // For public statement routes, don't show loading state
      isLoading: isPublicStatementRoute ? false : (isLoading || isFetching),
      isAuthenticated: Boolean(resolvedUser?.id),
      error,
      logout: handleLogout,
      refetch: refetchUser,
    }),
    [resolvedUser, roles, isLoading, isFetching, error, refetchUser, isPublicStatementRoute]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

