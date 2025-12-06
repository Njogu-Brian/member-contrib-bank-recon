import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfileUpdateStatus, resetMemberProfileLink, resetAllProfileLinks } from '../api/members'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import { HiCheckCircle, HiXCircle, HiOutlineUser, HiArrowPath } from 'react-icons/hi2'
import { Link } from 'react-router-dom'

export default function ProfileUpdateStatus() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, completed, incomplete
  const [activeFilter, setActiveFilter] = useState('all') // all, active, inactive
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile-update-status', page, searchTerm, statusFilter, activeFilter],
    queryFn: () => getProfileUpdateStatus({
      page,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    }),
  })

  const resetLinkMutation = useMutation({
    mutationFn: resetMemberProfileLink,
    onSuccess: () => {
      queryClient.invalidateQueries(['profile-update-status'])
      alert('Profile link reset successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to reset profile link')
    },
  })

  const resetAllLinksMutation = useMutation({
    mutationFn: resetAllProfileLinks,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['profile-update-status'])
      alert(`Profile links reset successfully for ${data.count || 0} member(s)`)
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to reset profile links')
    },
  })

  const members = data?.data || []
  const pagination = data?.meta ? {
    current_page: data.meta.current_page || page,
    last_page: data.meta.last_page || 1,
    per_page: data.meta.per_page || 50,
    total: data.meta.total || 0,
  } : null
  const stats = data?.statistics || {}

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Update Status"
        description="Track member profile completion status"
        metric={stats.completed || 0}
        metricLabel="Completed Profiles"
        gradient="from-green-600 to-emerald-600"
      />

      {/* Reset Links Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (confirm('Are you sure you want to reset profile links for ALL members? This action cannot be undone.')) {
              resetAllLinksMutation.mutate()
            }
          }}
          disabled={resetAllLinksMutation.isPending}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HiArrowPath className={`w-4 h-4 mr-2 ${resetAllLinksMutation.isPending ? 'animate-spin' : ''}`} />
          Reset All Profile Links
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_members || 0}</p>
              </div>
              <HiOutlineUser className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.completion_rate || 0}% completion rate
                </p>
              </div>
              <HiCheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Incomplete</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.incomplete || 0}</p>
              </div>
              <HiXCircle className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Completed</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.active_completed || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.active_completion_rate || 0}% of active
                </p>
              </div>
              <HiCheckCircle className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              placeholder="🔍 Search by name, phone, email, or member code..."
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Members</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missing Fields
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                      <p className="text-gray-500">Loading profile status...</p>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <HiOutlineUser className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No members found</p>
                      <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            <Link
                              to={`/members/${member.id}`}
                              className="text-indigo-600 hover:text-indigo-900 hover:underline"
                            >
                              {member.name}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-500">{member.member_code || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.phone || '-'}</div>
                      <div className="text-sm text-gray-500">{member.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {member.is_profile_complete ? (
                          <>
                            <HiCheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium text-green-700">Complete</span>
                          </>
                        ) : (
                          <>
                            <HiXCircle className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-medium text-orange-700">Incomplete</span>
                          </>
                        )}
                        {!member.is_active && (
                          <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.profile_completed_at)}
                    </td>
                    <td className="px-6 py-4">
                      {member.missing_fields && member.missing_fields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.missing_fields.slice(0, 3).map((field, idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800"
                            >
                              {field}
                            </span>
                          ))}
                          {member.missing_fields.length > 3 && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800">
                              +{member.missing_fields.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/members/${member.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View Profile
                        </Link>
                        {member.has_public_token && (
                          <button
                            onClick={() => {
                              if (confirm(`Reset profile link for ${member.name}?`)) {
                                resetLinkMutation.mutate(member.id)
                              }
                            }}
                            disabled={resetLinkMutation.isPending}
                            className="text-red-600 hover:text-red-900 font-medium text-xs disabled:opacity-50"
                            title="Reset profile share link"
                          >
                            <HiArrowPath className={`w-4 h-4 inline ${resetLinkMutation.isPending ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <Pagination
              pagination={pagination}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

