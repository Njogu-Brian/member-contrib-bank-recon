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
  // Then update when React Router location changes
  const [pathname, setPathname] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return ''
  })
  
  // Update pathname when React Router location changes
  useEffect(() => {
    if (routerLocation?.pathname) {
      setPathname(routerLocation.pathname)
    }
  }, [routerLocation?.pathname])
  
  // Skip auth check for public routes
  const isPublicRoute = pathname.startsWith('/s/') || 
                       pathname.startsWith('/public/') ||
                       pathname === '/login' ||
                       pathname === '/forgot-password' ||
                       pathname === '/reset-password'

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !isPublicRoute, // Don't check auth for public routes
  })

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

