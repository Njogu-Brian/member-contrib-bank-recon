import { useEffect } from 'react'

export function useFavicon(faviconUrl) {
  useEffect(() => {
    if (faviconUrl) {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll("link[rel*='icon']")
      existingLinks.forEach(link => link.remove())

      // Create new favicon link
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/x-icon'
      link.href = faviconUrl
      document.head.appendChild(link)
    }
  }, [faviconUrl])
}

