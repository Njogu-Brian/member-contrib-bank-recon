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
      console.log('Login page settings loaded:', {
        logo_url: effectiveSettings?.logo_url,
        favicon_url: effectiveSettings?.favicon_url,
        normalized_logo: logoUrl,
      })
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
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen gap-0 lg:grid-cols-2">
        <div 
          className="relative hidden flex-col justify-between px-10 py-12 lg:flex"
          style={{ 
            background: `linear-gradient(to bottom right, var(--color-brand-600, ${primaryColor}), var(--login-bg-color, ${loginBgColor}))`
          }}
        >
          <div>
            <div className="mb-6">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={appName}
                  className="h-12 object-contain max-w-xs bg-white/50 p-2 rounded"
                  onError={(e) => {
                    console.error('Failed to load logo:', logoUrl)
                    // Show fallback instead of hiding
                    e.target.style.display = 'none'
                    const fallback = e.target.nextElementSibling
                    if (fallback) fallback.style.display = 'block'
                  }}
                  onLoad={() => console.log('Logo loaded successfully:', logoUrl)}
                />
              ) : null}
              {(!logoUrl || !effectiveSettings?.logo_url) && (
                <div className="text-2xl font-bold text-slate-900">{appName}</div>
              )}
            </div>
            <p className="text-sm uppercase tracking-widest text-slate-700">{appName}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
              Finance & governance portal for modern chamas.
            </h1>
            <p className="mt-4 text-slate-600">
              Reconcile statements, approve payouts, and keep your members informed in real time.
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/90 backdrop-blur p-6 shadow-lg">
              <p className="text-sm uppercase tracking-widest text-slate-600">Live snapshot</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Pending approvals</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {snapshot?.pending_approvals ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Today's inflow</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {snapshot?.today_inflow ? formatCurrency(snapshot.today_inflow) : '—'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Announcements */}
            {announcements && announcements.length > 0 && (
              <div className="rounded-3xl bg-white/90 backdrop-blur p-6 shadow-lg">
                <p className="text-sm uppercase tracking-widest text-slate-600 mb-4">Announcements</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-l-4 border-brand-600 pl-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white">
          <div className="mx-auto w-full max-w-md space-y-8">
            <div>
              <div className="mb-6">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={appName}
                    className="h-10 object-contain max-w-xs"
                    onError={(e) => {
                      console.error('Failed to load logo:', logoUrl)
                      // Show fallback instead of hiding
                      e.target.style.display = 'none'
                    }}
                    onLoad={() => console.log('Logo loaded successfully:', logoUrl)}
                  />
                ) : null}
                {(!logoUrl || !effectiveSettings?.logo_url) && (
                  <div className="text-xl font-bold text-slate-900">{appName}</div>
                )}
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                Staff access
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                Sign in to {appName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the administrator credentials assigned to you. Need help? Contact Super Admin.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="glass space-y-5 rounded-3xl border px-6 py-8">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="you@evimeria.africa"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Protected with MFA</span>
                <button 
                  type="button" 
                  onClick={() => navigate('/forgot-password')}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-60"
              >
                {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
