import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'

const queryClient = new QueryClient()

// Check if this is a public route BEFORE rendering the app
const isPublicRoute = typeof window !== 'undefined' && 
  (window.location.pathname.startsWith('/s/') || 
   window.location.pathname.startsWith('/public/'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isPublicRoute ? (
          // For public routes, render App without AuthProvider to prevent auth checks
          <App />
        ) : (
          // For protected routes, use AuthProvider
          <AuthProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </AuthProvider>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

