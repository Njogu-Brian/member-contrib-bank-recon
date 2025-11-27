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
          if (data.logo_url) setLogoUrl(data.logo_url)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Logo and Header */}
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={appName}
                className="h-16 w-auto object-contain print:h-20"
                onError={() => setLogoUrl(null)}
              />
            ) : (
              <div className="h-16 w-16 bg-indigo-600 rounded-lg flex items-center justify-center print:h-20 print:w-20">
                <span className="text-white font-bold text-xl print:text-2xl">
                  {appName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 print:text-3xl">{appName}</h1>
              <p className="text-sm text-gray-600 print:text-base">Member Contribution Statement</p>
            </div>
          </div>
          
          {/* Action Buttons (hidden in print) */}
          <div className="flex items-center gap-2 print:hidden">
            {onPrint && (
              <button
                onClick={onPrint}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Print
              </button>
            )}
            {onDownloadPDF && (
              <button
                onClick={onDownloadPDF}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Download PDF
              </button>
            )}
          </div>
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
            {isPublic && (
              <p className="text-xs text-gray-500 mt-1 print:text-sm">
                Public View - No login required
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

