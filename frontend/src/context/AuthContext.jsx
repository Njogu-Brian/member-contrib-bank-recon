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
  
  // Skip auth check for public routes - check immediately on mount
  // Use useMemo to ensure this is calculated before the query runs
  // Check window.location directly to avoid any React Router timing issues
  const isPublicRoute = useMemo(() => {
    // Always check window.location first (most reliable)
    const currentPath = typeof window !== 'undefined' 
      ? window.location.pathname 
      : (pathname || getInitialPathname())
    
    const isPublic = currentPath.startsWith('/s/') || 
                     currentPath.startsWith('/public/') ||
                     currentPath === '/login' ||
                     currentPath === '/forgot-password' ||
                     currentPath === '/reset-password'
    
    return isPublic
  }, [pathname])

  // For public routes, completely skip the auth query
  // Use a conditional query that only runs for non-public routes
  const authQuery = useQuery({
    queryKey: ['auth', 'user', isPublicRoute ? 'public' : 'private'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !isPublicRoute, // Don't check auth for public routes
    // Ensure query doesn't run if disabled
    refetchOnMount: !isPublicRoute,
    refetchOnWindowFocus: !isPublicRoute,
    // Don't use cached data for public routes
    gcTime: isPublicRoute ? 0 : 5 * 60 * 1000,
    // For public routes, return immediately without making the request
    ...(isPublicRoute && {
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
      // For public routes, don't show loading state
      isLoading: isPublicRoute ? false : (isLoading || isFetching),
      isAuthenticated: Boolean(resolvedUser?.id),
      error,
      logout: handleLogout,
      refetch: refetchUser,
    }),
    [resolvedUser, roles, isLoading, isFetching, error, refetchUser, isPublicRoute]
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

