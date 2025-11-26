import { createContext, useContext, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/settings'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Retry once if fails
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })

  // Update favicon immediately on mount (before settings load)
  useEffect(() => {
    // Try to load favicon from settings if available
    if (settings?.favicon_url || settings?.Favicon_url) {
      const faviconUrl = settings.favicon_url || settings.Favicon_url
      let normalizedUrl = faviconUrl
      if (faviconUrl.startsWith('http://localhost/storage/') || faviconUrl.startsWith('http://localhost:8000/storage/')) {
        normalizedUrl = faviconUrl.replace(/^https?:\/\/[^/]+/, '')
      }
      
      const timestamp = new Date().getTime()
      const separator = normalizedUrl.includes('?') ? '&' : '?'
      const urlWithCacheBuster = `${normalizedUrl}${separator}_=${timestamp}`
      
      const existingLinks = document.querySelectorAll("link[rel*='icon']")
      existingLinks.forEach(link => link.remove())
      
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
    }
  }, [settings?.favicon_url, settings?.Favicon_url])

  // Apply CSS variables globally when settings change
  useEffect(() => {
    if (settings) {
      const root = document.documentElement
      
      // Apply brand colors
      if (settings.theme_primary_color) {
        root.style.setProperty('--color-brand-600', settings.theme_primary_color)
        root.style.setProperty('--color-brand-700', settings.theme_primary_color)
      }
      if (settings.theme_secondary_color) {
        root.style.setProperty('--color-brand-500', settings.theme_secondary_color)
      }
      
      // Apply login colors
      if (settings.login_background_color) {
        root.style.setProperty('--login-bg-color', settings.login_background_color)
      }
      if (settings.login_text_color) {
        root.style.setProperty('--login-text-color', settings.login_text_color)
      }
      
      // Update favicon - convert absolute URLs to relative for dev server
      const faviconUrl = settings.favicon_url || settings.Favicon_url
      if (faviconUrl) {
        // Convert absolute URLs to relative for Vite dev server proxy
        let normalizedUrl = faviconUrl
        if (faviconUrl.startsWith('http://localhost/storage/') || faviconUrl.startsWith('http://localhost:8000/storage/')) {
          normalizedUrl = faviconUrl.replace(/^https?:\/\/[^/]+/, '')
        }
        
        // Add cache busting parameter to force browser refresh
        const timestamp = new Date().getTime()
        const separator = normalizedUrl.includes('?') ? '&' : '?'
        const urlWithCacheBuster = `${normalizedUrl}${separator}_=${timestamp}`
        
        // Remove all existing favicon links
        const existingLinks = document.querySelectorAll("link[rel*='icon']")
        existingLinks.forEach(link => link.remove())
        
        // Create new favicon link
        const link = document.createElement('link')
        link.rel = 'icon'
        link.type = 'image/x-icon'
        link.href = urlWithCacheBuster
        
        // Also add as shortcut icon for better browser compatibility
        const shortcutLink = document.createElement('link')
        shortcutLink.rel = 'shortcut icon'
        shortcutLink.type = 'image/x-icon'
        shortcutLink.href = urlWithCacheBuster
        
        document.head.appendChild(link)
        document.head.appendChild(shortcutLink)
        
        // Force browser to refresh favicon
        const forceRefresh = document.createElement('link')
        forceRefresh.rel = 'icon'
        forceRefresh.type = 'image/x-icon'
        forceRefresh.href = ''
        setTimeout(() => {
          forceRefresh.href = urlWithCacheBuster
          document.head.appendChild(forceRefresh)
        }, 100)
      }
    }
  }, [settings])

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}

