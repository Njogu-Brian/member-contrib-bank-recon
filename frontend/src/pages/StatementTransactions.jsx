import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStatement } from '../api/statements'
import { getTransactions, archiveTransaction, unarchiveTransaction, bulkAssign, transferTransaction, bulkArchiveTransactions } from '../api/transactions'
import { getMembers } from '../api/members'
import MemberSearchModal from '../components/MemberSearchModal'
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
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    member_id: '',
    sort_by: 'tran_date',
    sort_order: 'desc',
  })
  const [selectedTransactions, setSelectedTransactions] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedMemberForAssign, setSelectedMemberForAssign] = useState(null)
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState(null)
  const [transferNotes, setTransferNotes] = useState('')
  const [isTransferSearchOpen, setIsTransferSearchOpen] = useState(false)
  const [isShareMode, setIsShareMode] = useState(false)
  const [shareEntries, setShareEntries] = useState([])
  const [activeShareIndex, setActiveShareIndex] = useState(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(null)
  const actionMenuRef = useRef(null)

  const { data: statementData, isLoading: statementLoading } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => getStatement(id),
  })

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'statement', id, page, perPage, filters],
    queryFn: () => {
      const params = { 
        bank_statement_id: id, 
        page, 
        per_page: perPage, 
        include_archived: true,
        ...filters
      }
      return getTransactions(params)
    },
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', 'filter'],
    queryFn: () => getMembers({ per_page: 1000 }),
  })

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('button[type="button"]') || 
          event.target.closest('.fixed.z-50') ||
          event.target.closest('.fixed.z-40')) {
        return
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null)
      }
    }
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const bulkAssignMutation = useMutation({
    mutationFn: ({ transactionIds, memberId }) => bulkAssign(transactionIds, memberId),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['transactions', 'statement', id])
      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['members'])
      setSelectedTransactions([])
      setSelectedMemberForAssign(null)
      const success = result?.success ?? 0
      const errors = Array.isArray(result?.errors) ? result.errors.filter(Boolean) : []
      const message = [
        `Bulk assignment complete.`,
        `Successful: ${success}`,
        errors.length ? `Failed: ${errors.length}\n${errors.join('\n')}` : null,
      ].filter(Boolean).join('\n\n')
      alert(message)
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Bulk assignment failed')
    },
  })

  const transferMutation = useMutation({
    mutationFn: ({ id, toMemberId, recipients, notes }) => transferTransaction(id, { toMemberId, recipients, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions', 'statement', id])
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

  const bulkArchiveMutation = useMutation({
    mutationFn: ({ ids, reason }) => bulkArchiveTransactions(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions', 'statement', id])
      queryClient.invalidateQueries(['transactions'])
      setSelectedTransactions([])
      alert('Selected transactions archived')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to archive transactions')
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

  const handleAssignMemberSelect = (member) => {
    setSelectedMemberForAssign(member)
    setShowAssignModal(false)
    if (selectedTransactions.length === 0) {
      alert('Select at least one transaction to assign')
      return
    }
    bulkAssignMutation.mutate({
      transactionIds: selectedTransactions,
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

  const handleBulkArchive = () => {
    if (bulkArchiveMutation.isPending || selectedTransactions.length === 0) {
      return
    }

    if (!confirm(`Archive ${selectedTransactions.length} transaction(s)?`)) {
      return
    }

    const reason = prompt('Enter a reason for archiving (optional):')?.trim()
    if (reason === undefined) {
      return
    }

    bulkArchiveMutation.mutate({
      ids: selectedTransactions,
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

  const resetTransferState = () => {
    setShowTransferModal(false)
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
  const selectableTransactionIds = transactions
    .filter((tx) => !tx.is_archived)
    .map((tx) => tx.id)
  const archivingId = archiveMutation.variables?.id
  const unarchivingId = unarchiveMutation.variables

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
        {selectedTransactions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowAssignModal(true)
              }}
              disabled={bulkAssignMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {bulkAssignMutation.isPending ? 'Assigning...' : `Bulk Assign (${selectedTransactions.length})`}
            </button>
            <button
              onClick={handleBulkArchive}
              disabled={bulkArchiveMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {bulkArchiveMutation.isPending ? 'Archiving...' : `Bulk Archive (${selectedTransactions.length})`}
            </button>
            <button
              onClick={() => setSelectedTransactions([])}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Selection
            </button>
          </div>
        )}
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

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All</option>
              <option value="unassigned">Unassigned</option>
              <option value="auto_assigned">Auto Assigned</option>
              <option value="manual_assigned">Manual Assigned</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value })
                setPage(1)
              }}
              placeholder="Search transactions..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Member</label>
            <select
              value={filters.member_id}
              onChange={(e) => {
                setFilters({ ...filters, member_id: e.target.value })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Members</option>
              {membersData?.data?.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
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
        </div>
      </div>

      {selectedTransactions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedTransactions([])}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear selection
          </button>
        </div>
      )}

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
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={
                        selectableTransactionIds.length > 0 &&
                        selectableTransactionIds.every((id) => selectedTransactions.includes(id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransactions(selectableTransactionIds)
                        } else {
                          setSelectedTransactions([])
                        }
                      }}
                      disabled={selectableTransactionIds.length === 0}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
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
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[300px]">Particulars</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Code</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
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
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={(e) => {
                          if (transaction.is_archived) {
                            return
                          }
                          if (e.target.checked) {
                            setSelectedTransactions([...new Set([...selectedTransactions, transaction.id])])
                          } else {
                            setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id))
                          }
                        }}
                        disabled={transaction.is_archived}
                        title={transaction.is_archived ? 'Archived transactions cannot be selected' : undefined}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(transaction.tran_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900">
                      <div className="min-w-[300px] max-w-2xl break-words whitespace-normal" title={transaction.particulars}>
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
                          <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
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
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setSelectedTransactions([transaction.id])
                                      setShowAssignModal(true)
                                      setActionMenuOpen(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100"
                                  >
                                    {transaction.member_id ? 'Reassign' : 'Assign'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleTransfer(transaction)
                                      setActionMenuOpen(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-gray-100"
                                  >
                                    {transaction.member_id ? 'Transfer/Share' : 'Assign/Share'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleArchive(transaction)
                                      setActionMenuOpen(null)
                                    }}
                                    disabled={archiveMutation.isPending && archivingId === transaction.id}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    {archiveMutation.isPending && archivingId === transaction.id ? 'Archiving...' : 'Archive'}
                                  </button>
                                </>
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

      {/* Member Search Modal for Assign */}
      <MemberSearchModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedMemberForAssign(null)
        }}
        onSelect={handleAssignMemberSelect}
        title="Select Member to Assign"
      />

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
