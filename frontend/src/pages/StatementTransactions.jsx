import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStatement } from '../api/statements'
import { getTransactions, archiveTransaction, unarchiveTransaction } from '../api/transactions'
import Pagination from '../components/Pagination'

export default function StatementTransactions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data: statementData, isLoading: statementLoading } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => getStatement(id),
  })

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'statement', id, page],
    queryFn: () => getTransactions({ bank_statement_id: id, page, include_archived: true }),
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
            <span className="ml-4">{transactions.length} transactions</span>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Particulars
                  </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${transaction.is_archived ? 'bg-gray-50 text-gray-500' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.tran_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="break-words" title={transaction.particulars}>
                        {transaction.particulars}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.transaction_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      KSh {parseFloat(transaction.credit || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.member ? (
                        <div>
                          <div className="font-medium">{transaction.member.name}</div>
                          {transaction.member.phone && (
                            <div className="text-xs text-gray-500">{transaction.member.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                          transaction.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                          transaction.assignment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.assignment_status || 'unassigned'}
                        </span>
                        {transaction.is_archived && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Archived
                          </span>
                        )}
                      </div>
                      {transaction.is_archived && transaction.archive_reason && (
                        <div className="mt-1 text-xs text-gray-500">
                          Reason: {transaction.archive_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {transaction.is_archived ? (
                          <button
                            onClick={() => handleUnarchive(transaction)}
                            disabled={unarchiveMutation.isPending && unarchivingId === transaction.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {unarchiveMutation.isPending && unarchivingId === transaction.id ? 'Restoring...' : 'Restore'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(transaction)}
                            disabled={archiveMutation.isPending && archivingId === transaction.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {archiveMutation.isPending && archivingId === transaction.id ? 'Archiving...' : 'Archive'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <Pagination
              pagination={{
                current_page: pagination.current_page || 1,
                last_page: pagination.last_page || 1,
                per_page: pagination.per_page || 20,
                total: pagination.total || 0,
              }}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </>
      )}
    </div>
  )
}

