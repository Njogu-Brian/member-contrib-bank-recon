import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStatement } from '../api/statements'
import { getTransactions, archiveTransaction, unarchiveTransaction } from '../api/transactions'
import Pagination from '../components/Pagination'
import { HiEllipsisVertical } from 'react-icons/hi2'

const formatCurrency = (value) =>
  Number(value ?? 0).toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  })

export default function StatementTransactions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const { data: statementData, isLoading: statementLoading } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => getStatement(id),
  })

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'statement', id, page, perPage],
    queryFn: () => getTransactions({ bank_statement_id: id, page, per_page: perPage, include_archived: true }),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id: transactionId, reason }) => archiveTransaction(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions', 'statement', id])
      queryClient.invalidateQueries(['transactions'])
      alert('Transaction archived')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to archive transaction')
    },
  })

  const unarchiveMutation = useMutation({
    mutationFn: (transactionId) => unarchiveTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions', 'statement', id])
      queryClient.invalidateQueries(['transactions'])
      alert('Transaction restored')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to restore transaction')
    },
  })

  const archivingId = archiveMutation.variables?.id
  const unarchivingId = unarchiveMutation.variables
  const [actionMenuOpen, setActionMenuOpen] = useState(null)
  const actionMenuRef = useRef(null)

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleArchive = (transaction) => {
    if (archiveMutation.isPending) {
      return
    }

    const reason = prompt('Enter a reason for archiving (optional):')?.trim()
    if (reason === undefined) {
      return
    }

    archiveMutation.mutate({
      id: transaction.id,
      reason: reason || undefined,
    })
  }

  const handleUnarchive = (transaction) => {
    if (unarchiveMutation.isPending) {
      return
    }

    if (!confirm('Restore this transaction?')) {
      return
    }

    unarchiveMutation.mutate(transaction.id)
  }

  if (statementLoading || transactionsLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!statementData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Statement not found</p>
        <button
          onClick={() => navigate('/statements')}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Back to Statements
        </button>
      </div>
    )
  }

  const transactions = transactionsData?.data || []
  const pagination = transactionsData?.meta || {}
  const metrics = statementData.metrics || {}
  const assignmentBreakdown = metrics.assignment_breakdown || {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate('/statements')}
            className="text-indigo-600 hover:text-indigo-900 mb-2"
          >
            ← Back to Statements
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Statement: {statementData.filename}</h1>
          <div className="mt-2 text-sm text-gray-600">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              statementData.status === 'completed' ? 'bg-green-100 text-green-800' :
              statementData.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
              statementData.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {statementData.status}
            </span>
            <span className="ml-4">{metrics.total_transactions ?? transactions.length} transactions</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {metrics.first_transaction_date && metrics.last_transaction_date
              ? `Period: ${new Date(metrics.first_transaction_date).toLocaleDateString()} – ${new Date(
                  metrics.last_transaction_date
                ).toLocaleDateString()}`
              : null}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Total Credit</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(metrics.total_credit)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Total Debit</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(metrics.total_debit)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Duplicates</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.duplicates ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Unassigned Members</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.unassigned_members ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Assignment Breakdown</h2>
          <dl className="mt-3 space-y-2">
            {['auto_assigned', 'manual_assigned', 'draft', 'unassigned', 'duplicate'].map((key) => (
              <div key={key} className="flex items-center justify-between text-sm text-gray-700">
                <dt className="capitalize">{key.replace('_', ' ')}</dt>
                <dd className="font-semibold">{assignmentBreakdown[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Archived Transactions</h2>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.archived_transactions ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Transactions manually archived from this statement.</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No transactions found for this statement.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-x-auto sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Particulars</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Code</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Member</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Status</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${transaction.is_archived ? 'bg-gray-50 text-gray-500' : ''}`}
                  >
                    <td className="px-2 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(transaction.tran_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={transaction.particulars}>
                        {transaction.particulars}
                      </div>
                      <div className="lg:hidden mt-1 flex flex-wrap gap-1">
                        {transaction.member?.name && (
                          <span className="text-xs text-gray-500">{transaction.member.name}</span>
                        )}
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                          transaction.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                          transaction.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                          transaction.assignment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.assignment_status || 'unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                      {transaction.transaction_code || '-'}
                    </td>
                    <td className="px-2 py-2 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(transaction.credit || 0)}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900 hidden lg:table-cell">
                      {transaction.member ? (
                        <div>
                          <div className="font-medium max-w-xs truncate" title={transaction.member.name}>{transaction.member.name}</div>
                          {transaction.member.phone && (
                            <div className="text-xs text-gray-500">{transaction.member.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-2 py-2 hidden lg:table-cell">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                        transaction.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                        transaction.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                        transaction.assignment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.assignment_status || 'unassigned'}
                      </span>
                      {transaction.is_archived && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="relative inline-block" ref={actionMenuRef}>
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === transaction.id ? null : transaction.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                          title="Actions"
                        >
                          <HiEllipsisVertical className="h-5 w-5" />
                        </button>
                        {actionMenuOpen === transaction.id && (
                          <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              {transaction.is_archived ? (
                                <button
                                  onClick={() => {
                                    handleUnarchive(transaction)
                                    setActionMenuOpen(null)
                                  }}
                                  disabled={unarchiveMutation.isPending && unarchivingId === transaction.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {unarchiveMutation.isPending && unarchivingId === transaction.id ? 'Restoring...' : 'Restore'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleArchive(transaction)
                                    setActionMenuOpen(null)
                                  }}
                                  disabled={archiveMutation.isPending && archivingId === transaction.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {archiveMutation.isPending && archivingId === transaction.id ? 'Archiving...' : 'Archive'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">Show</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value))
                      setPage(1)
                    }}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
                <Pagination
                  pagination={{
                    current_page: pagination.current_page || 1,
                    last_page: pagination.last_page || 1,
                    per_page: perPage,
                    total: pagination.total || 0,
                  }}
                  onPageChange={(newPage) => setPage(newPage)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

