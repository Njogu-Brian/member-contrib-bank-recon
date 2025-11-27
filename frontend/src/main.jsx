// CRITICAL: Check for public route IMMEDIATELY before any imports
// This must happen synchronously before React or any other code runs
(function() {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const isPublicRoute = pathname.startsWith('/s/') || pathname.startsWith('/public/')
    // Store in window so we can access it after imports
    window.__IS_PUBLIC_ROUTE__ = isPublicRoute
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

// Get the public route flag set before imports
const isPublicRoute = typeof window !== 'undefined' && window.__IS_PUBLIC_ROUTE__ === true

// Create a wrapper component that ensures public route check
function RootApp() {
  // Re-check on mount to be absolutely sure
  const [isPublic] = React.useState(() => {
    if (typeof window === 'undefined') return false
    const pathname = window.location.pathname
    return pathname.startsWith('/s/') || pathname.startsWith('/public/')
  })
  
  if (isPublic) {
    // For public routes, use completely separate PublicApp that has NO auth dependencies
    return <PublicApp />
  }
  
  // For protected routes, use AuthProvider
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

