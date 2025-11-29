import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReconciliationLogs, reconcilePayment } from '../api/payments'
import { HiCheckCircle, HiXCircle, HiClock, HiArrowPath } from 'react-icons/hi2'
import Pagination from '../components/Pagination'

export default function MpesaReconciliation() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['mpesa-reconciliation', { page, status: statusFilter }],
    queryFn: () => getReconciliationLogs({ page, status: statusFilter }),
  })

  // Calculate summary from logs data
  const summary = data?.data?.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1
    return acc
  }, {}) || {}

  const reconcileMutation = useMutation({
    mutationFn: reconcilePayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['mpesa-reconciliation'])
      queryClient.invalidateQueries(['mpesa-reconciliation-summary'])
    },
  })

  const getStatusBadge = (status) => {
    const badges = {
      matched: { icon: HiCheckCircle, color: 'bg-green-100 text-green-800', label: 'Matched' },
      unmatched: { icon: HiXCircle, color: 'bg-yellow-100 text-yellow-800', label: 'Unmatched' },
      duplicate: { icon: HiArrowPath, color: 'bg-red-100 text-red-800', label: 'Duplicate' },
      pending: { icon: HiClock, color: 'bg-gray-100 text-gray-800', label: 'Pending' },
      error: { icon: HiXCircle, color: 'bg-red-100 text-red-800', label: 'Error' },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">MPESA Reconciliation</h1>
        <p className="text-gray-600 mt-1">View and manage MPESA transaction reconciliation</p>
      </div>

      {/* Summary Cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(summary).map(([status, count]) => (
            <div key={status} className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 capitalize">{status}</div>
              <div className="text-2xl font-bold mt-1">{count || 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched</option>
              <option value="duplicate">Duplicate</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reconciliation Logs */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : data && data.data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.data.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{log.transaction_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.payload?.amount ? `KES ${parseFloat(log.payload.amount).toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.payment?.member?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.notes || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(log.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.status === 'unmatched' && log.payment_id && (
                          <button
                            onClick={() => reconcileMutation.mutate(log.payment_id)}
                            disabled={reconcileMutation.isLoading}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Pagination
                  currentPage={data.meta.current_page}
                  totalPages={data.meta.last_page}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">No reconciliation logs found</div>
        )}
      </div>
    </div>
  )
}

