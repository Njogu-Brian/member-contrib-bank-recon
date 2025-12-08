import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { HiCheckCircle, HiXCircle, HiClock, HiUser, HiDocumentText, HiPhoto } from 'react-icons/hi2'
import api from '../api/axios'
import { getPendingKycDocuments, approveKycDocument, rejectKycDocument, activateMember } from '../api/kyc'

const fieldLabels = {
  name: 'Name',
  phone: 'Phone',
  whatsapp_number: 'WhatsApp Number',
  email: 'Email',
  id_number: 'ID Number',
  church: 'Church',
  next_of_kin_name: 'Next of Kin Name',
  next_of_kin_phone: 'Next of Kin Phone',
  next_of_kin_relationship: 'Next of Kin Relationship',
}

export default function PendingProfileChanges() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'kyc'
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pending-profile-changes', page, searchTerm, selectedMemberId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        per_page: 25,
      })
      if (searchTerm) params.append('search', searchTerm)
      if (selectedMemberId) params.append('member_id', selectedMemberId)

      const response = await api.get(`/admin/pending-profile-changes?${params}`)
      return response.data
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['pending-profile-changes-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/pending-profile-changes/statistics')
      return response.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (changeId) => {
      const response = await api.post(`/admin/pending-profile-changes/${changeId}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-profile-changes'])
      queryClient.invalidateQueries(['pending-profile-changes-stats'])
      alert('Change approved successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to approve change')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ changeId, reason }) => {
      const response = await api.post(`/admin/pending-profile-changes/${changeId}/reject`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-profile-changes'])
      queryClient.invalidateQueries(['pending-profile-changes-stats'])
      alert('Change rejected successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to reject change')
    },
  })

  const approveMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      const response = await api.post(`/admin/pending-profile-changes/member/${memberId}/approve-all`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['pending-profile-changes'])
      queryClient.invalidateQueries(['pending-profile-changes-stats'])
      alert(data.message || 'All changes approved successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to approve changes')
    },
  })

  // KYC Mutations
  const approveKycMutation = useMutation({
    mutationFn: ({ documentId, notes }) => approveKycDocument(documentId, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kyc-pending'])
      queryClient.invalidateQueries(['members'])
      alert('KYC document approved successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to approve KYC document')
    },
  })

  const rejectKycMutation = useMutation({
    mutationFn: ({ documentId, reason }) => rejectKycDocument(documentId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kyc-pending'])
      queryClient.invalidateQueries(['members'])
      setShowRejectModal(false)
      setRejectionReason('')
      alert('KYC document rejected successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to reject KYC document')
    },
  })

  const activateMemberMutation = useMutation({
    mutationFn: activateMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      queryClient.invalidateQueries(['kyc-pending'])
      alert('Member activated successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to activate member')
    },
  })

  const handleKycReject = (document) => {
    setSelectedDocument(document)
    setShowRejectModal(true)
  }

  const handleKycRejectSubmit = () => {
    if (!rejectionReason.trim()) return
    rejectKycMutation.mutate({
      documentId: selectedDocument.id,
      reason: rejectionReason,
    })
  }

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/pending-profile-changes/approve-all')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['pending-profile-changes'])
      queryClient.invalidateQueries(['pending-profile-changes-stats'])
      alert(data.message || 'All changes approved successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to approve changes')
    },
  })

  const changes = data?.data || []
  const pagination = data ? {
    current_page: data.current_page || page,
    last_page: data.last_page || 1,
    per_page: data.per_page || 25,
    total: data.total || 0,
  } : null

  // Group changes by member
  const changesByMember = React.useMemo(() => {
    return changes.reduce((acc, change) => {
      if (!change.member) return acc // Skip if member is null
      const memberId = change.member_id
      if (!acc[memberId]) {
        acc[memberId] = {
          member: change.member,
          changes: [],
        }
      }
      acc[memberId].changes.push(change)
      return acc
    }, {})
  }, [changes])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile & KYC Approvals"
        description="Review and approve member profile updates and KYC documents"
        metric={(stats?.total_pending || 0) + (kycDocuments?.length || 0)}
        metricLabel="Total Pending"
        gradient="from-orange-600 to-red-600"
      >
        {activeTab === 'profile' && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to approve ALL pending changes for ALL members?')) {
                approveAllMutation.mutate()
              }
            }}
            disabled={approveAllMutation.isPending || !stats?.total_pending}
            className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HiCheckCircle className="w-4 h-4 mr-2" />
            Approve All
          </button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'profile'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile Changes ({stats?.total_pending || 0})
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'kyc'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              KYC Documents ({kycDocuments?.length || 0})
            </button>
          </nav>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.total_pending || 0}</p>
              </div>
              <HiClock className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.total_approved || 0}</p>
              </div>
              <HiCheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.total_rejected || 0}</p>
              </div>
              <HiXCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Members</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pending_by_member || 0}</p>
                <p className="text-xs text-gray-500 mt-1">with pending changes</p>
              </div>
              <HiUser className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPage(1)
          }}
          placeholder={activeTab === 'profile' 
            ? "🔍 Search by member name, phone, email, or member code..."
            : "🔍 Search by member name, phone, or document type..."}
          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      {/* Profile Changes Tab */}
      {activeTab === 'profile' && (
      <div>
      {/* Changes List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading pending changes...</p>
          </div>
        ) : changes.length === 0 ? (
          <div className="p-12 text-center">
            <HiCheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No pending changes</p>
            <p className="text-sm text-gray-500 mt-2">All profile changes have been reviewed</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(changesByMember).map(({ member, changes: memberChanges }) => 
                    member ? (
                    <React.Fragment key={member.id}>
                      <tr className="bg-blue-50">
                        <td colSpan="6" className="px-6 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link
                                to={`/members/${member.id}`}
                                className="text-sm font-semibold text-blue-900 hover:text-blue-700"
                              >
                                {member.name}
                              </Link>
                              <p className="text-xs text-blue-700 mt-1">
                                {memberChanges.length} change(s) pending
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm(`Approve all ${memberChanges.length} changes for ${member.name}?`)) {
                                  approveMemberMutation.mutate(member.id)
                                }
                              }}
                              disabled={approveMemberMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              <HiCheckCircle className="w-3 h-3 mr-1" />
                              Approve All
                            </button>
                          </div>
                        </td>
                      </tr>
                      {memberChanges.map((change) => (
                        <tr key={change.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {/* Empty - member info in header row */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {fieldLabels[change.field_name] || change.field_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {change.old_value || <span className="text-gray-400 italic">(empty)</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate font-medium">
                            {change.new_value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(change.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (confirm(`Approve this change?`)) {
                                    approveMutation.mutate(change.id)
                                  }
                                }}
                                disabled={approveMutation.isPending}
                                className="text-green-600 hover:text-green-900 font-medium disabled:opacity-50"
                                title="Approve"
                              >
                                <HiCheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason (optional):')
                                  if (reason !== null) {
                                    rejectMutation.mutate({ changeId: change.id, reason })
                                  }
                                }}
                                disabled={rejectMutation.isPending}
                                className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                                title="Reject"
                              >
                                <HiXCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                    ) : null
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
          </>
        )}
      </div>
      </div>
      )}

      {/* KYC Documents Tab */}
      {activeTab === 'kyc' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoadingKyc ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading KYC documents...</p>
            </div>
          ) : !kycDocuments || kycDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <HiDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">No pending KYC documents</p>
              <p className="text-sm text-gray-500 mt-2">All KYC documents have been reviewed</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {kycDocuments.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link
                          to={`/members/${doc.member_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {doc.member?.name || 'Unknown Member'}
                        </Link>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {doc.status}
                        </span>
                        {doc.member?.kyc_status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.member.kyc_status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            doc.member.kyc_status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            KYC: {doc.member.kyc_status}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Document Type:</span>
                          <p className="mt-1 capitalize">{doc.document_type?.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span>
                          <p className="mt-1">{doc.member?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Email:</span>
                          <p className="mt-1">{doc.member?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Uploaded:</span>
                          <p className="mt-1">
                            {new Date(doc.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      {doc.validation_results && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Validation Results:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className={`px-2 py-1 rounded ${doc.is_clear ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {doc.is_clear ? '✓ Clear' : '✗ Blurred'}
                            </div>
                            {doc.document_type !== 'back_id' && (
                              <div className={`px-2 py-1 rounded ${doc.has_face ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {doc.has_face ? '✓ Face Detected' : '✗ No Face'}
                              </div>
                            )}
                            {doc.document_type !== 'selfie' && (
                              <div className={`px-2 py-1 rounded ${doc.is_kenyan_id ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {doc.is_kenyan_id ? '✓ Kenyan ID' : '✗ Not Kenyan ID'}
                              </div>
                            )}
                            {doc.document_type !== 'selfie' && (
                              <div className={`px-2 py-1 rounded ${doc.is_readable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {doc.is_readable ? '✓ Readable' : '⚠ Low Readability'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {doc.path && (
                        <div className="mt-3">
                          <a
                            href={`/storage/${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            <HiPhoto className="w-4 h-4 mr-1" />
                            View Document
                          </a>
                        </div>
                      )}
                      {doc.member?.kyc_status === 'approved' && !doc.member?.is_active && (
                        <button
                          onClick={() => {
                            if (confirm(`Activate member ${doc.member.name}?`)) {
                              activateMemberMutation.mutate(doc.member.id)
                            }
                          }}
                          disabled={activateMemberMutation.isLoading}
                          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {activateMemberMutation.isLoading ? 'Activating...' : 'Activate Member'}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          if (confirm(`Approve this ${doc.document_type?.replace('_', ' ')} document?`)) {
                            approveKycMutation.mutate({ documentId: doc.id, notes: '' })
                          }
                        }}
                        disabled={approveKycMutation.isLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                      >
                        <HiCheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleKycReject(doc)}
                        disabled={rejectKycMutation.isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                      >
                        <HiXCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Reject KYC Document</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                rows="4"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleKycRejectSubmit}
                disabled={!rejectionReason.trim() || rejectKycMutation.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {rejectKycMutation.isLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

