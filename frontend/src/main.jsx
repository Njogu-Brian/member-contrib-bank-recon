// CRITICAL: Check for public statement route IMMEDIATELY before any imports
// This must happen synchronously before React or any other code runs
(function() {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    // Only /s/ and /public/ are true public routes that bypass auth
    // /login, /forgot-password, etc. are public but still need AuthProvider
    const isPublicStatementRoute = pathname.startsWith('/s/') || pathname.startsWith('/public/')
    // Store in window so we can access it after imports
    window.__IS_PUBLIC_STATEMENT_ROUTE__ = isPublicStatementRoute
    
    // Session persistence fix: Clear token if browser was just opened (sessionStorage cleared)
    // sessionStorage is cleared when browser closes, so if it doesn't exist, clear the token
    if (!isPublicStatementRoute) {
      const sessionActive = sessionStorage.getItem('session_active')
      const token = localStorage.getItem('token')
      
      // If we have a token but no active session, the browser was just opened/closed
      // Clear the token to enforce session expiration on browser close
      if (token && !sessionActive) {
        localStorage.removeItem('token')
        localStorage.removeItem('token_timestamp')
      } else if (token && sessionActive) {
        // Token exists and session is active - keep the session active flag
        // This handles page refreshes within the same browser session
        sessionStorage.setItem('session_active', 'true')
      }
    }
  }
})()

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import PublicApp from './PublicApp.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'

const queryClient = new QueryClient()

// Get the public statement route flag set before imports
const isPublicStatementRoute = typeof window !== 'undefined' && window.__IS_PUBLIC_STATEMENT_ROUTE__ === true

// Create a wrapper component that ensures public statement route check
function RootApp() {
  // Re-check on mount to be absolutely sure
  const [isPublicStatement] = React.useState(() => {
    if (typeof window === 'undefined') return false
    const pathname = window.location.pathname
    // Only /s/ and /public/ bypass auth completely
    return pathname.startsWith('/s/') || pathname.startsWith('/public/')
  })
  
  if (isPublicStatement) {
    // For public statement routes, use completely separate PublicApp that has NO auth dependencies
    return <PublicApp />
  }
  
  // For all other routes (including /login, /forgot-password, etc.), use AuthProvider
  // This allows login/logout to work properly
  return (
    <AuthProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RootApp />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

