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

// Check if this is a public route BEFORE rendering the app
// Use a function to ensure we get the current pathname at render time
function getIsPublicRoute() {
  if (typeof window === 'undefined') return false
  const pathname = window.location.pathname
  return pathname.startsWith('/s/') || pathname.startsWith('/public/')
}

// Store the check result immediately
const isPublicRoute = getIsPublicRoute()

// Create a wrapper component that re-checks on mount to handle any timing issues
function RootApp() {
  const [isPublic, setIsPublic] = React.useState(isPublicRoute)
  
  React.useEffect(() => {
    // Double-check on mount in case pathname changed
    const check = getIsPublicRoute()
    if (check !== isPublic) {
      setIsPublic(check)
    }
  }, [isPublic])
  
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

