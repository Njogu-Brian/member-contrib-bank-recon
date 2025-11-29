import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPendingKycDocuments, approveKycDocument, rejectKycDocument, activateMember } from '../api/kyc'
import { getMembers } from '../api/members'
import { HiCheckCircle, HiXCircle, HiDocumentText } from 'react-icons/hi2'

export default function KycManagement() {
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: documents, isLoading } = useQuery({
    queryKey: ['kyc-pending'],
    queryFn: getPendingKycDocuments,
  })

  const approveMutation = useMutation({
    mutationFn: ({ documentId, notes }) => approveKycDocument(documentId, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kyc-pending'])
      queryClient.invalidateQueries(['members'])
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ documentId, reason, notes }) => rejectKycDocument(documentId, { reason, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kyc-pending'])
      queryClient.invalidateQueries(['members'])
      setShowRejectModal(false)
      setRejectionReason('')
    },
  })

  const activateMutation = useMutation({
    mutationFn: activateMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
    },
  })

  const handleReject = (document) => {
    setSelectedDocument(document)
    setShowRejectModal(true)
  }

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) return
    rejectMutation.mutate({
      documentId: selectedDocument.id,
      reason: rejectionReason,
      notes: '',
    })
  }

  if (isLoading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Document Review</h1>
        <p className="text-gray-600 mt-1">Review and approve pending KYC documents</p>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <HiDocumentText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No pending KYC documents</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{doc.member?.name || 'Unknown Member'}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.member?.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      doc.member?.kyc_status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.member?.kyc_status || 'pending'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Document Type:</strong> {doc.document_type}</p>
                    <p><strong>Phone:</strong> {doc.member?.phone}</p>
                    <p><strong>Email:</strong> {doc.member?.email || 'N/A'}</p>
                    {doc.file_name && (
                      <p><strong>File:</strong> {doc.file_name}</p>
                    )}
                  </div>
                  {doc.member?.kyc_status === 'approved' && !doc.member?.is_active && (
                    <button
                      onClick={() => activateMutation.mutate(doc.member.id)}
                      disabled={activateMutation.isLoading}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {activateMutation.isLoading ? 'Activating...' : 'Activate Member'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate({ documentId: doc.id, notes: '' })}
                    disabled={approveMutation.isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <HiCheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(doc)}
                    disabled={rejectMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <HiXCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim() || rejectMutation.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

