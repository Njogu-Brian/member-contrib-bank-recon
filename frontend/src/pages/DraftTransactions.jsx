import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTransactions, assignTransaction } from '../api/transactions'
import MemberSearchModal from '../components/MemberSearchModal'
import Pagination from '../components/Pagination'

export default function DraftTransactions() {
  const [page, setPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['draft-transactions', page],
    queryFn: () => getTransactions({ status: 'draft', page }),
  })


  const assignMutation = useMutation({
    mutationFn: ({ transactionId, memberId }) => assignTransaction(transactionId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries(['draft-transactions'])
      queryClient.invalidateQueries(['transactions'])
      setSelectedTransaction(null)
      alert('Transaction assigned successfully!')
    },
    onError: (error) => {
      alert('Failed to assign transaction: ' + (error.response?.data?.message || error.message))
    },
  })

  const handleAssign = (transaction) => {
    setSelectedTransaction(transaction)
  }

  const handleMemberSelect = (member) => {
    if (!selectedTransaction) return
    assignMutation.mutate({
      transactionId: selectedTransaction.id,
      memberId: member.id,
    })
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const transactions = data?.data || []
  const pagination = data || {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Draft Transactions</h1>
        <div className="text-sm text-gray-600">
          {pagination.total || 0} draft transactions requiring manual assignment
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No draft transactions found.</p>
          <p className="text-sm text-gray-400 mt-2">All transactions have been assigned or are unassigned.</p>
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
                    Suggested Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Potential Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.tran_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
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
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        {transaction.draft_members && transaction.draft_members.length > 0 ? (
                          <div className="space-y-2">
                            {transaction.draft_members.map((member) => (
                              <div key={member.id} className="flex items-center justify-between gap-2 text-xs break-words border-b border-gray-100 pb-1 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{member.name}</span>
                                  {member.phone && (
                                    <span className="text-gray-500 ml-2">({member.phone})</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    assignMutation.mutate({
                                      transactionId: transaction.id,
                                      memberId: member.id,
                                    })
                                  }}
                                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap flex-shrink-0"
                                  title={`Assign to ${member.name}`}
                                  disabled={assignMutation.isLoading}
                                >
                                  {assignMutation.isLoading ? 'Assigning...' : 'Assign'}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No matches</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="flex flex-col">
                          {transaction.match_logs && transaction.match_logs.length > 0 ? (
                            <>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full inline-block w-fit mb-1 ${
                                transaction.match_confidence >= 1.0 ? 'bg-green-100 text-green-800' :
                                transaction.match_confidence >= 0.9 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {transaction.match_confidence ? (transaction.match_confidence * 100).toFixed(0) + '%' : 'N/A'}
                              </span>
                              <div className="text-xs text-gray-600 break-words">
                                {transaction.match_logs[0].match_reason}
                              </div>
                            </>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {transaction.match_confidence ? (transaction.match_confidence * 100).toFixed(0) + '%' : 'N/A'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleAssign(transaction)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination.last_page > 1 && (
            <Pagination
              pagination={{
                current_page: pagination.current_page || page,
                last_page: pagination.last_page || 1,
                per_page: pagination.per_page || 20,
                total: pagination.total || 0,
              }}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </>
      )}

      {/* Assign Modal with Member Search */}
      <MemberSearchModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onSelect={handleMemberSelect}
        title={selectedTransaction ? `Assign Transaction - ${new Date(selectedTransaction.tran_date).toLocaleDateString()} - KSh ${parseFloat(selectedTransaction.credit || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : 'Select Member'}
        preSelectedId={selectedTransaction?.member_id}
      />
    </div>
  )
}

