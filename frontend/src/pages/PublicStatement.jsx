import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import StatementHeader from '../components/StatementHeader'
import ProfileUpdateModal from '../components/ProfileUpdateModal'

const formatCurrency = (value) =>
  Number(value ?? 0).toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  })

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function PublicStatement() {
  const { token } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [perPage, setPerPage] = useState(parseInt(searchParams.get('per_page') || '25', 10))
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [profileIncompleteError, setProfileIncompleteError] = useState(null)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)

  // Ensure we have a token
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">No token provided in the link.</p>
        </div>
      </div>
    )
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-statement', token, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page, per_page: perPage })
      try {
        // Use absolute URL to ensure correct routing
        // Try both relative and absolute paths
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
        let url = `${baseUrl}/public/statement/${token}?${params}`
        
        // If baseUrl is relative, make it absolute
        if (url.startsWith('/')) {
          url = window.location.origin + url
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        
        if (!response.ok) {
          let errorData = {}
          try {
            errorData = await response.json()
          } catch {
            errorData = { message: `HTTP error! status: ${response.status}` }
          }
          
          // Special handling for profile incomplete error
          if (response.status === 403 && errorData.requires_profile_update) {
            // Fetch profile data to pre-populate modal
            const profileResponse = await fetch(
              `${window.location.origin}/api/v1/public/profile/${token}/status`
            )
            if (profileResponse.ok) {
              const profileInfo = await profileResponse.json()
              setProfileData(profileInfo.member)
            }
            setProfileIncompleteError(errorData)
            setShowProfileModal(true)
          }
          
          const error = new Error(errorData.message || `HTTP error! status: ${response.status}`)
          error.status = response.status
          error.response = { data: errorData, status: response.status }
          throw error
        }
        
        return await response.json()
      } catch (err) {
        // Don't let axios interceptor redirect for public routes
        if (err.status === 401 || err.status === 419) {
          // Return error data instead of letting interceptor handle it
          throw err
        }
        throw err
      }
    },
    retry: false,
  })

  const handleProfileUpdate = async (updatedData) => {
    // Profile updated successfully
    setShowProfileModal(false)
    
    // If changes are pending approval, don't refetch yet - show message instead
    if (updatedData?.pending) {
      // Don't clear profileIncompleteError since profile is still incomplete
      // The user needs to wait for admin approval
      return
    }
    
    // If profile is now complete (shouldn't happen with pending system, but just in case)
    setProfileIncompleteError(null)
    await refetch()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statement...</p>
        </div>
      </div>
    )
  }

  if (error && !profileIncompleteError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-4">
            {error.response?.data?.message || 'This statement link is invalid or has expired.'}
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator for a new statement link.
          </p>
        </div>
      </div>
    )
  }

  // Show profile update modal if profile is incomplete
  if (profileIncompleteError) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-8 text-center">
            <div className="text-indigo-600 text-6xl mb-4">👤</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Profile Incomplete</h1>
            <p className="text-gray-600 mb-6 text-lg">
              {profileIncompleteError.message}
            </p>
            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-indigo-800 font-medium">
                Please complete your profile to access your member statement.
              </p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg text-lg"
            >
              Complete Profile Now
            </button>
          </div>
        </div>
        <ProfileUpdateModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUpdate={handleProfileUpdate}
          token={token}
          initialData={profileData}
        />
      </>
    )
  }

  const { member, statement, summary, pagination, monthly_totals } = data || {}

  const handlePageChange = (newPage) => {
    setPage(newPage)
    setSearchParams({ ...Object.fromEntries(searchParams), page: newPage })
  }

  const handleDownloadPDF = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      let url = `${baseUrl}/public/statement/${token}/pdf`
      if (url.startsWith('/')) {
        url = window.location.origin + url
      }
      
      // Add query params if any
      const params = new URLSearchParams()
      if (searchParams.get('month')) params.append('month', searchParams.get('month'))
      if (searchParams.get('start_date')) params.append('start_date', searchParams.get('start_date'))
      if (searchParams.get('end_date')) params.append('end_date', searchParams.get('end_date'))
      if (params.toString()) url += '?' + params.toString()

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `statement_${member?.name || 'member'}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      alert('Failed to download PDF: ' + (error.message || 'Unknown error'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Statement Header with Logo */}
      <StatementHeader 
        member={member} 
        isPublic={true}
        onDownloadPDF={handleDownloadPDF}
      />

      {/* Edit Profile Button - Show if member exists (profile is already complete to view statement) */}
      {member && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={async () => {
              // Fetch current profile data
              try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
                let url = `${baseUrl}/public/profile/${token}/status`
                if (url.startsWith('/')) {
                  url = window.location.origin + url
                }
                const response = await fetch(url, {
                  headers: { 'Accept': 'application/json' },
                  credentials: 'include',
                })
                if (response.ok) {
                  const profileInfo = await response.json()
                  setProfileData(profileInfo.member)
                } else {
                  setProfileData(member)
                }
              } catch (error) {
                setProfileData(member)
              }
              setShowEditProfileModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md"
          >
            ✏️ Edit Profile
          </button>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <ProfileUpdateModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onUpdate={async (data) => {
            try {
              const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
              let url = `${baseUrl}/public/profile/${token}/update`
              if (url.startsWith('/')) {
                url = window.location.origin + url
              }

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include',
              })

              const result = await response.json()

              if (!response.ok) {
                throw new Error(result.message || 'Failed to update profile')
              }

              alert(result.message || 'Profile changes submitted for admin approval.')
              setShowEditProfileModal(false)
              // Optionally refetch statement data
              refetch()
            } catch (error) {
              alert('Error: ' + (error.message || 'Failed to update profile'))
            }
          }}
          token={token}
          initialData={profileData}
        />
      )}

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Contributions</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary?.total_contributions || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Expected Contributions</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary?.expected_contributions || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Difference</p>
            <p
              className={`text-2xl font-bold ${
                (summary?.difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary?.difference || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary?.contribution_status || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Statement Table - Bank Statement Style */}
        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border print:border-gray-300">
          <div className="px-6 py-4 border-b border-gray-200 print:px-4 print:py-2">
            <h2 className="text-lg font-semibold text-gray-900 print:text-base">Transaction History</h2>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-gray-200 print:table-fixed print:w-full">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider print:px-2 print:py-2 print:text-xs print:border print:border-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider print:px-2 print:py-2 print:text-xs print:border print:border-gray-300">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider print:px-2 print:py-2 print:text-xs print:border print:border-gray-300">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider print:px-2 print:py-2 print:text-xs print:border print:border-gray-300">
                    Amount (KES)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-300">
                {statement?.length > 0 ? (
                  statement.map((entry, index) => (
                    <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent print:border-b print:border-gray-300">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:px-2 print:py-2 print:text-xs print:border-r print:border-gray-300">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 print:px-2 print:py-2 print:text-xs print:border-r print:border-gray-300">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:px-2 print:py-2 print:text-xs print:border-r print:border-gray-300">
                        {entry.reference || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900 print:px-2 print:py-2 print:text-xs">
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 print:px-2 print:py-4 print:text-xs">
                      No transactions found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                {pagination.total} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.last_page}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Totals */}
        {monthly_totals && monthly_totals.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border print:border-gray-300">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Monthly Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contributions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthly_totals.map((month, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(month.contributions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(month.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-8 border-t border-gray-200 print:border-t-2">
        <p className="text-xs text-gray-600 text-center print:text-sm">
          This is an electronically generated statement. For further clarification, contact the administrator{' '}
          {data?.contact_phone && (
            <span className="font-semibold">at {data.contact_phone}</span>
          )}
        </p>
      </div>
    </div>
  )
}

