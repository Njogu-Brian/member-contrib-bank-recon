import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTransactions, assignTransaction, transferTransaction } from '../api/transactions'
import MemberSearchModal from '../components/MemberSearchModal'
import Pagination from '../components/Pagination'

export default function DraftTransactions() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [filters, setFilters] = useState({
    sort_by: 'tran_date',
    sort_order: 'desc',
  })
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState(null)
  const [transferNotes, setTransferNotes] = useState('')
  const [isTransferSearchOpen, setIsTransferSearchOpen] = useState(false)
  const [isShareMode, setIsShareMode] = useState(false)
  const [shareEntries, setShareEntries] = useState([])
  const [activeShareIndex, setActiveShareIndex] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['draft-transactions', page, perPage, filters],
    queryFn: () => getTransactions({ status: 'draft', page, per_page: perPage, ...filters }),
  })

  useEffect(() => {
    if (!showTransferModal) {
      setSelectedTransaction(null)
      setSelectedMemberForTransfer(null)
      setTransferNotes('')
      setIsShareMode(false)
      setShareEntries([])
      setActiveShareIndex(null)
      setIsTransferSearchOpen(false)
    }
  }, [showTransferModal])


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

  const transferMutation = useMutation({
    mutationFn: ({ id, toMemberId, recipients, notes }) => transferTransaction(id, { toMemberId, recipients, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['draft-transactions'])
      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['members'])
      setShowTransferModal(false)
      setSelectedTransaction(null)
      alert('Transaction transferred successfully')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Transfer failed')
    },
  })

  const handleMemberSelect = (member) => {
    if (!selectedTransaction) return
    assignMutation.mutate({
      transactionId: selectedTransaction.id,
      memberId: member.id,
    })
  }

  const initializeShareEntriesForTransaction = (transaction) => {
    const amount = Number(transaction?.credit || transaction?.debit || 0)
    const member = transaction?.member || null
    setShareEntries([
      {
        member,
        amount: amount ? amount.toFixed(2) : '',
      },
    ])
  }

  const handleTransfer = (transaction) => {
    setSelectedTransaction(transaction)
    setSelectedMemberForTransfer(null)
    setTransferNotes('')
    const shouldUseShareMode = !transaction.member_id
    setIsShareMode(shouldUseShareMode)
    if (shouldUseShareMode) {
      initializeShareEntriesForTransaction(transaction)
    } else {
      setShareEntries([])
    }
    setActiveShareIndex(null)
    setShowTransferModal(true)
  }

  const handleShareModeToggle = (checked, transaction) => {
    setIsShareMode(checked)
    setSelectedMemberForTransfer(null)
    if (checked) {
      initializeShareEntriesForTransaction(transaction)
    } else {
      setShareEntries([])
      setActiveShareIndex(null)
    }
  }

  const handleAddShareEntry = () => {
    setShareEntries((prev) => [
      ...prev,
      {
        member: null,
        amount: '',
      },
    ])
  }

  const handleShareAmountChange = (index, value) => {
    setShareEntries((prev) =>
      prev.map((entry, idx) =>
        idx === index ? { ...entry, amount: value } : entry
      )
    )
  }

  const handleRemoveShareEntry = (index) => {
    setShareEntries((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleTransferSubmit = () => {
    if (!selectedTransaction) {
      return
    }

    if (isShareMode) {
      if (shareEntries.length === 0) {
        alert('Add at least one member to share with')
        return
      }

      const totalAmount = shareEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0)
      const transactionAmount = Number(selectedTransaction.credit || selectedTransaction.debit || 0)

      if (shareEntries.some(entry => !entry.member || !entry.member.id)) {
        alert('Each share entry must have a selected member')
        return
      }

      if (shareEntries.some(entry => !entry.amount || Number(entry.amount) <= 0)) {
        alert('Each share entry must have a positive amount')
        return
      }

      if (Math.abs(totalAmount - transactionAmount) > 0.01) {
        alert('Shared amounts must add up exactly to the transaction total')
        return
      }

      const recipientsPayload = shareEntries.map(entry => ({
        member_id: entry.member.id,
        amount: Number(entry.amount),
        notes: transferNotes || undefined,
      }))

      transferMutation.mutate({
        id: selectedTransaction.id,
        recipients: recipientsPayload,
        notes: transferNotes || undefined,
      })
      return
    }

    if (!selectedMemberForTransfer) {
      alert('Please select a member to transfer to')
      return
    }

    if (selectedTransaction.member_id === selectedMemberForTransfer.id) {
      alert('Cannot transfer to the same member')
      return
    }

    transferMutation.mutate({
      id: selectedTransaction.id,
      toMemberId: selectedMemberForTransfer.id,
      notes: transferNotes,
    })
  }

  const handleTransferMemberSelect = (member) => {
    if (!member) return

    if (isShareMode) {
      if (activeShareIndex === null) {
        setIsTransferSearchOpen(false)
        return
      }
      setShareEntries((prev) =>
        prev.map((entry, idx) =>
          idx === activeShareIndex ? { ...entry, member } : entry
        )
      )
      setActiveShareIndex(null)
      setIsTransferSearchOpen(false)
      return
    }

    if (selectedTransaction && selectedTransaction.member_id === member.id) {
      alert('Cannot transfer to the same member')
      return
    }

    setSelectedMemberForTransfer(member)
    setIsTransferSearchOpen(false)
  }

  const resetTransferState = () => {
    setShowTransferModal(false)
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

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sort By</label>
            <select
              value={`${filters.sort_by}_${filters.sort_order}`}
              onChange={(e) => {
                const [sort_by, sort_order] = e.target.value.split('_')
                setFilters({ ...filters, sort_by, sort_order })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="tran_date_desc">Date: Newest First</option>
              <option value="tran_date_asc">Date: Oldest First</option>
              <option value="credit_desc">Amount: Highest First</option>
              <option value="credit_asc">Amount: Lowest First</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Per Page</label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
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
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => {
                            setFilters({ ...filters, sort_by: 'tran_date', sort_order: 'asc' })
                            setPage(1)
                          }}
                          className={`text-xs leading-none ${filters.sort_by === 'tran_date' && filters.sort_order === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`}
                          title="Sort: Oldest to Newest"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            setFilters({ ...filters, sort_by: 'tran_date', sort_order: 'desc' })
                            setPage(1)
                          }}
                          className={`text-xs leading-none ${filters.sort_by === 'tran_date' && filters.sort_order === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`}
                          title="Sort: Newest to Oldest"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                    Particulars
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => {
                            setFilters({ ...filters, sort_by: 'credit', sort_order: 'asc' })
                            setPage(1)
                          }}
                          className={`text-xs leading-none ${filters.sort_by === 'credit' && filters.sort_order === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`}
                          title="Sort: Lowest to Highest"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            setFilters({ ...filters, sort_by: 'credit', sort_order: 'desc' })
                            setPage(1)
                          }}
                          className={`text-xs leading-none ${filters.sort_by === 'credit' && filters.sort_order === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`}
                          title="Sort: Highest to Lowest"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
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
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="min-w-[300px] max-w-2xl break-words whitespace-normal" title={transaction.particulars}>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAssign(transaction)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => handleTransfer(transaction)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Transfer/Share
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination && (pagination.last_page > 1 || pagination.total > 0) && (
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
                    current_page: pagination.current_page || page,
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

      {/* Assign Modal with Member Search */}
      <MemberSearchModal
        isOpen={!!selectedTransaction && !showTransferModal}
        onClose={() => setSelectedTransaction(null)}
        onSelect={handleMemberSelect}
        title={selectedTransaction ? `Assign Transaction - ${new Date(selectedTransaction.tran_date).toLocaleDateString()} - KSh ${parseFloat(selectedTransaction.credit || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : 'Select Member'}
        preSelectedId={selectedTransaction?.member_id}
      />

      {/* Transfer/Share Modal */}
      {showTransferModal && selectedTransaction && (
        <div className="fixed z-40 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={resetTransferState}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {selectedTransaction.member_id ? 'Transfer Transaction' : 'Assign Transaction'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Amount:{' '}
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(selectedTransaction.credit || selectedTransaction.debit || 0)}{' '}
                      {selectedTransaction.member?.name ? `• Currently assigned to ${selectedTransaction.member.name}` : '• Unassigned'}
                    </p>

                    {selectedTransaction.member_id && (
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          id="share-mode"
                          type="checkbox"
                          checked={isShareMode}
                          onChange={(e) => handleShareModeToggle(e.target.checked, selectedTransaction)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <label htmlFor="share-mode" className="text-sm text-gray-700">
                          Share this deposit among multiple members
                        </label>
                      </div>
                    )}
                    
                    {!selectedTransaction.member_id && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          This transaction is unassigned. You can assign it to a single member or share it among multiple members.
                        </p>
                      </div>
                    )}

                    {isShareMode ? (
                      <div className="mt-4 space-y-4">
                        {shareEntries.map((entry, index) => (
                          <div key={index} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Member</label>
                                <button
                                  onClick={() => {
                                    setActiveShareIndex(index)
                                    setIsTransferSearchOpen(true)
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                  {entry.member ? entry.member.name : 'Select member'}
                                </button>
                              </div>
                              <div className="w-40">
                                <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={entry.amount}
                                  onChange={(e) => handleShareAmountChange(index, e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              {shareEntries.length > 1 && (
                                <button
                                  onClick={() => handleRemoveShareEntry(index)}
                                  className="text-sm text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center justify-between text-sm">
                          <div>
                            Total shared:{' '}
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                              shareEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0)
                            )}
                          </div>
                          <div>
                            Remaining:{' '}
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                              (selectedTransaction.credit || selectedTransaction.debit || 0) -
                                shareEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0)
                            )}
                          </div>
                        </div>

                        <button
                          onClick={handleAddShareEntry}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          + Add another member
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transfer To Member</label>
                        <button
                          onClick={() => {
                            setActiveShareIndex(null)
                            setIsTransferSearchOpen(true)
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {selectedMemberForTransfer ? selectedMemberForTransfer.name : 'Click to search for member...'}
                        </button>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                      <textarea
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        rows={3}
                        placeholder="Reason for transfer or sharing..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                      <button
                        onClick={handleTransferSubmit}
                        disabled={transferMutation.isPending}
                        className="inline-flex justify-center w-full sm:w-auto rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
                      >
                        {isShareMode
                          ? (transferMutation.isPending ? 'Assigning...' : (selectedTransaction.member_id ? 'Share Deposit' : 'Assign to Members'))
                          : (transferMutation.isPending ? 'Transferring...' : (selectedTransaction.member_id ? 'Transfer' : 'Assign'))}
                      </button>
                      <button
                        onClick={resetTransferState}
                        className="inline-flex justify-center w-full sm:w-auto rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Search Modal for Transfer */}
      <MemberSearchModal
        isOpen={isTransferSearchOpen}
        onClose={() => {
          setIsTransferSearchOpen(false)
          setActiveShareIndex(null)
        }}
        onSelect={handleTransferMemberSelect}
        title={isShareMode ? 'Select member to share with' : 'Transfer Transaction to Member'}
      />
    </div>
  )
}

