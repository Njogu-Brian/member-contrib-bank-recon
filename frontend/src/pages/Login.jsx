import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login } from '../api/auth'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/settings'
import { useSettings } from '../context/SettingsContext'
import api from '../api/axios'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Fetch public settings (no auth required) for login page
  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const response = await api.get('/public/settings')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  })
  
  // Try to get settings from context (if available)
  let settingsFromContext = null
  try {
    const contextResult = useSettings()
    settingsFromContext = contextResult.settings
  } catch (e) {
    // Context not available, that's okay
  }
  
  const effectiveSettings = publicSettings || settingsFromContext
  const appName = effectiveSettings?.app_name || 'Evimeria Portal'
  
  // Fetch dashboard snapshot (public endpoint, no auth required)
  const { data: snapshot } = useQuery({
    queryKey: ['public-dashboard-snapshot'],
    queryFn: async () => {
      const response = await api.get('/public/dashboard/snapshot')
      return response.data
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 60000, // Refetch every minute
  })
  
  // Fetch public announcements (no auth required)
  const { data: announcements } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: async () => {
      const response = await api.get('/public/announcements')
      return response.data || []
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
  
  // Normalize logo URL for dev server proxy
  const normalizeUrl = (url) => {
    if (!url) return null
    // Handle both absolute and relative URLs
    if (url.startsWith('http://localhost/storage/') || url.startsWith('http://localhost:8000/storage/')) {
      return url.replace(/^https?:\/\/[^/]+/, '')
    }
    // If URL starts with /storage, it's already normalized
    if (url.startsWith('/storage/')) {
      return url
    }
    return url
  }
  
  const logoUrl = effectiveSettings ? normalizeUrl(effectiveSettings?.logo_url || effectiveSettings?.Logo_url) : null
  
  // Debug logging
  useEffect(() => {
    if (effectiveSettings) {
      // Settings loaded - only log in development
      if (import.meta.env.DEV) {
        console.log('Login page settings loaded:', {
          logo_url: effectiveSettings?.logo_url,
          favicon_url: effectiveSettings?.favicon_url,
          normalized_logo: logoUrl,
        })
      }
    }
  }, [effectiveSettings, logoUrl])
  const primaryColor = effectiveSettings?.theme_primary_color || '#6366f1'
  // Default to white/bright colors
  const loginBgColor = effectiveSettings?.login_background_color || '#ffffff'
  const loginTextColor = effectiveSettings?.login_text_color || '#1e293b'
  
  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'KES 0'
    const currency = effectiveSettings?.default_currency || effectiveSettings?.currency || 'KES'
    const formatted = new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
    return `${currency} ${formatted}`
  }
  
  // Update CSS variables and favicon when settings change
  useEffect(() => {
    if (!effectiveSettings) return
    
    const root = document.documentElement
    if (effectiveSettings?.theme_primary_color) {
      root.style.setProperty('--color-brand-600', effectiveSettings.theme_primary_color)
    }
    if (effectiveSettings?.theme_secondary_color) {
      root.style.setProperty('--color-brand-500', effectiveSettings.theme_secondary_color)
    }
    if (effectiveSettings?.login_background_color) {
      root.style.setProperty('--login-bg-color', effectiveSettings.login_background_color)
    }
    if (effectiveSettings?.login_text_color) {
      root.style.setProperty('--login-text-color', effectiveSettings.login_text_color)
    }
    
    // Update favicon immediately
    const faviconUrl = effectiveSettings?.favicon_url || effectiveSettings?.Favicon_url
    if (faviconUrl) {
      let normalizedUrl = faviconUrl
      // Handle absolute URLs for dev server
      if (faviconUrl.startsWith('http://localhost/storage/') || faviconUrl.startsWith('http://localhost:8000/storage/')) {
        normalizedUrl = faviconUrl.replace(/^https?:\/\/[^/]+/, '')
      }
      
      // Add cache busting
      const timestamp = new Date().getTime()
      const separator = normalizedUrl.includes('?') ? '&' : '?'
      const urlWithCacheBuster = `${normalizedUrl}${separator}v=${timestamp}`
      
      // Remove all existing favicon links
      const existingLinks = document.querySelectorAll("link[rel*='icon']")
      existingLinks.forEach(link => link.remove())
      
      // Create new favicon links
      const link = document.createElement('link')
      link.id = 'dynamic-favicon'
      link.rel = 'icon'
      link.type = 'image/x-icon'
      link.href = urlWithCacheBuster
      
      const shortcutLink = document.createElement('link')
      shortcutLink.id = 'dynamic-favicon-shortcut'
      shortcutLink.rel = 'shortcut icon'
      shortcutLink.type = 'image/x-icon'
      shortcutLink.href = urlWithCacheBuster
      
      document.head.appendChild(link)
      document.head.appendChild(shortcutLink)
      
      // Force refresh by toggling
      setTimeout(() => {
        link.href = ''
        shortcutLink.href = ''
        setTimeout(() => {
          link.href = urlWithCacheBuster
          shortcutLink.href = urlWithCacheBuster
        }, 50)
      }, 100)
    }
  }, [effectiveSettings])

  const loginMutation = useMutation({
    mutationFn: () => login(formData.email, formData.password),
    onSuccess: async (data) => {
      setError('')
      
      // Set user data directly in cache for immediate update
      // This ensures AuthContext immediately recognizes the user as authenticated
      if (data?.user) {
        queryClient.setQueryData(['auth', 'user'], { user: data.user })
      }
      
      // Invalidate to trigger a refetch in the background (for consistency)
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
      
      // Check if password change is required (first login)
      if (data?.must_change_password) {
        navigate('/change-password', { replace: true, state: { firstLogin: true } })
      } else {
        // Navigate immediately - cache is already updated
        navigate('/', { replace: true })
      }
    },
    onError: (err) => {
      setError(err.response?.data?.message ?? 'Invalid credentials. Please try again.')
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="grid min-h-screen gap-0 lg:grid-cols-2">
        <div 
          className="relative hidden flex-col justify-between px-10 py-12 lg:flex overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)`
          }}
        >
          {/* Animated background patterns */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
          <div className="relative z-10">
            <div className="mb-8">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={appName}
                  className="h-16 object-contain max-w-xs bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-2xl ring-2 ring-white/50"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const fallback = e.target.nextElementSibling
                    if (fallback) fallback.style.display = 'block'
                  }}
                  onLoad={() => console.log('Logo loaded successfully:', logoUrl)}
                />
              ) : null}
              {(!logoUrl || !effectiveSettings?.logo_url) && (
                <div className="text-3xl font-bold text-white drop-shadow-lg">{appName}</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                <p className="text-sm font-semibold uppercase tracking-widest text-white">
                  {appName}
                </p>
              </div>
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-tight text-white drop-shadow-2xl">
              Finance & Governance Portal
            </h1>
            <p className="mt-6 text-xl text-white/90 drop-shadow-lg leading-relaxed">
              Reconcile bank statements, manage contributions, track invoices, and keep your members informed in real-time.
            </p>
            
            {/* Feature highlights */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-3xl mb-2">💰</div>
                <p className="text-sm font-semibold text-white">Smart Reconciliation</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm font-semibold text-white">Real-Time Reports</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-3xl mb-2">📱</div>
                <p className="text-sm font-semibold text-white">Mobile Access</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-3xl mb-2">🔐</div>
                <p className="text-sm font-semibold text-white">Secure & Compliant</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 relative z-10">
            <div className="rounded-3xl bg-white/95 backdrop-blur-lg p-6 shadow-2xl border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold uppercase tracking-widest text-purple-900">📈 Live Snapshot</p>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Pending Approvals</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {snapshot?.pending_approvals ?? '0'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Today's Inflow</p>
                  <p className="text-2xl font-bold text-green-900 mt-2">
                    {snapshot?.today_inflow ? formatCurrency(snapshot.today_inflow) : 'KES 0'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Announcements */}
            {announcements && announcements.length > 0 && (
              <div className="rounded-3xl bg-white/95 backdrop-blur-lg p-6 shadow-2xl border border-white/50">
                <p className="text-sm font-bold uppercase tracking-widest text-purple-900 mb-4">📢 Announcements</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-l-4 border-purple-500 bg-purple-50 pl-4 pr-3 py-3 rounded-r-lg">
                      <p className="text-sm font-bold text-purple-900">{announcement.title}</p>
                      <p className="text-xs text-purple-700 mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full filter blur-3xl opacity-30 -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full filter blur-3xl opacity-30 -ml-32 -mb-32"></div>
          
          <div className="mx-auto w-full max-w-md space-y-8 relative z-10">
            <div>
              <div className="mb-8 flex justify-center">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={appName}
                    className="h-16 object-contain max-w-xs drop-shadow-lg"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                    onLoad={() => {
                      if (import.meta.env.DEV) {
                        console.log('Logo loaded successfully:', logoUrl)
                      }
                    }}
                  />
                ) : null}
                {(!logoUrl || !effectiveSettings?.logo_url) && (
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{appName}</div>
                )}
              </div>
              <div className="text-center">
                <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-white">
                    🔐 Staff Access
                  </p>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-900 via-purple-700 to-pink-700 bg-clip-text text-transparent">
                  Welcome Back
                </h2>
                <p className="mt-3 text-base text-slate-600">
                  Sign in to access the {appName} management portal
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-white border-2 border-slate-200 px-8 py-10 shadow-2xl">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center">
                  <span className="mr-2">📧</span> Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="admin@evimeria.africa"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700 flex items-center">
                  <span className="mr-2">🔒</span> Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center text-slate-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Secure Connection
                </span>
                <button 
                  type="button" 
                  onClick={() => navigate('/forgot-password')}
                  className="font-semibold text-purple-600 hover:text-purple-700 underline decoration-2 underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 px-6 py-4 text-base font-bold text-white shadow-2xl shadow-purple-500/50 transition-all hover:shadow-purple-500/80 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  'Sign In to Portal'
                )}
              </button>
              
              <div className="text-center text-xs text-slate-500 mt-4">
                <p>Protected by enterprise-grade security</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
