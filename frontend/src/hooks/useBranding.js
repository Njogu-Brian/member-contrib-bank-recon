import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/settings'

export function useBranding() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!settings) return

    const root = document.documentElement
    
    // Set CSS variables for branding colors
    if (settings.theme_primary_color) {
      root.style.setProperty('--color-brand-600', settings.theme_primary_color)
      root.style.setProperty('--color-brand-700', settings.theme_primary_color)
    }
    
    if (settings.theme_secondary_color) {
      root.style.setProperty('--color-brand-500', settings.theme_secondary_color)
    }

    // Update favicon if available
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = settings.favicon_url
    }
  }, [settings])

  return settings
}

