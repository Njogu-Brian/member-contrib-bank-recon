import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * Statement Header Component with Logo
 * Used in both public and system statement views
 */
export default function StatementHeader({ member, isPublic = false, onPrint, onDownloadPDF }) {
  const [logoUrl, setLogoUrl] = useState(null)
  const [appName, setAppName] = useState('Member Contributions System')

  // Fetch public settings for logo
  useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
        let url = `${baseUrl}/public/settings`
        if (url.startsWith('/')) {
          url = window.location.origin + url
        }
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        })
        if (response.ok) {
          const data = await response.json()
          // Fix logo URL to use the correct backend origin
          if (data.logo_url) {
            // If logo_url is relative or points to localhost without port, fix it
            let fixedLogoUrl = data.logo_url
            if (fixedLogoUrl.startsWith('http://localhost/')) {
              // Replace with backend URL
              const backendUrl = import.meta.env.VITE_API_BASE_URL 
                ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '') 
                : 'http://localhost'
              fixedLogoUrl = fixedLogoUrl.replace('http://localhost', backendUrl)
            } else if (fixedLogoUrl.startsWith('/storage/')) {
              // Prepend backend origin
              const backendUrl = import.meta.env.VITE_API_BASE_URL 
                ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '') 
                : window.location.origin
              fixedLogoUrl = backendUrl + fixedLogoUrl
            }
            setLogoUrl(fixedLogoUrl)
          }
          if (data.app_name) setAppName(data.app_name)
          return data
        }
      } catch (err) {
        console.warn('Failed to load settings:', err)
      }
      return null
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const printDate = new Date().toLocaleString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white border-b border-gray-200 print:border-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 print:py-4">
        {/* Logo and Title - Stack on mobile, side-by-side on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6 print:mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo"
                className="h-12 w-auto object-contain sm:h-16 print:h-20"
                onError={() => setLogoUrl(null)}
              />
            ) : (
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-indigo-600 rounded-lg flex items-center justify-center print:h-20 print:w-20">
                <span className="text-white font-bold text-lg sm:text-xl print:text-2xl">
                  {appName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 print:text-3xl">
                Member Contribution Statement
              </h1>
            </div>
          </div>
          
          {/* Action Buttons - Hidden in print */}
          {onDownloadPDF && (
            <div className="print:hidden">
              <button
                onClick={onDownloadPDF}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg transition-all w-full sm:w-auto"
              >
                📥 Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Member Info - Bank Statement Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:mb-4">
          <div className="bg-gray-50 rounded-lg p-4 print:bg-transparent print:p-2 print:border print:border-gray-300">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 print:text-sm">
              Account Holder
            </h3>
            <p className="text-lg font-bold text-gray-900 print:text-xl">{member?.name || 'N/A'}</p>
            {member?.member_code && (
              <p className="text-sm text-gray-600 mt-1 print:text-base">
                Member Code: {member.member_code}
              </p>
            )}
            {member?.member_number && (
              <p className="text-sm text-gray-600 print:text-base">
                Member Number: {member.member_number}
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 print:bg-transparent print:p-2 print:border print:border-gray-300">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 print:text-sm">
              Statement Details
            </h3>
            <p className="text-sm text-gray-900 print:text-base">
              <span className="font-semibold">Printed:</span> {printDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

