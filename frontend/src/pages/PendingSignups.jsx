import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers, updateMember } from '../api/members'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'

export default function PendingSignups() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['members', 'pending-signups', page],
    queryFn: () => getMembers({ pending_signups: 1, page, per_page: 20 }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id }) => updateMember(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      queryClient.invalidateQueries(['members', 'pending-signups'])
    },
  })

  const handleApprove = (member) => {
    if (confirm(`Approve ${member.name} as a member? They will receive access to their statement link.`)) {
      approveMutation.mutate({ id: member.id })
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Pending Signups" />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      </div>
    )
  }

  const members = data?.data ?? []
  const isEmpty = members.length === 0

  return (
    <div className="p-6">
      <PageHeader
        title="Pending Signups"
        subtitle="Members who applied via the public signup link. Approve to activate their membership."
      />

      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Share the signup link:</strong>{' '}
          <code className="bg-amber-100 px-2 py-1 rounded">
            {typeof window !== 'undefined' ? `${window.location.origin}/join` : '/join'}
          </code>
        </p>
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No pending signups at the moment.</p>
          <Link to="/members" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
            ← Back to Members
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Church</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/members/${member.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                        {member.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.church || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.registration_requested_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleApprove(member)}
                        disabled={approveMutation.isLoading}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <Link
                        to={`/members/${member.id}`}
                        className="ml-2 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && (
            <Pagination
              pagination={{
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                per_page: data.per_page || 20,
                total: data.total || 0,
              }}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
