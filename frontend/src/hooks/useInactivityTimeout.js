import { useEffect, useRef, useCallback } from 'react'
import { useAuthContext } from '../context/AuthContext'

/**
 * Hook to handle user inactivity timeout
 * Automatically logs out user after a period of inactivity
 * 
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (default: 8 hours / 480 minutes)
 * @param {Array} events - DOM events to track for activity (default: mouse, keyboard, touch, scroll)
 */
export function useInactivityTimeout(timeoutMinutes = 480, events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']) {
  const { logout, isAuthenticated } = useAuthContext()
  const timeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  const resetTimeout = useCallback(() => {
    if (!isAuthenticated) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    const timeoutMs = timeoutMinutes * 60 * 1000
    timeoutRef.current = setTimeout(() => {
      // Logout user after inactivity
      console.log('Session expired due to inactivity')
      logout()
    }, timeoutMs)

    lastActivityRef.current = Date.now()
  }, [isAuthenticated, timeoutMinutes, logout])

  const handleActivity = useCallback(() => {
    if (!isAuthenticated) return

    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current

    // Only reset timeout if there was significant activity (avoid rapid resets)
    // Reset if more than 1 second has passed since last activity
    if (timeSinceLastActivity > 1000) {
      resetTimeout()
    }
  }, [isAuthenticated, resetTimeout])

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timeout if user is not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // Initialize timeout on mount
    resetTimeout()

    // Add event listeners for user activity
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, true)
    })

    // Also track visibility changes (tab focus/blur)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab, check if session is still valid
        resetTimeout()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, events, handleActivity, resetTimeout])

  return {
    resetTimeout,
    lastActivity: lastActivityRef.current,
  }
}

