import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getTransactions, autoAssign, transferTransaction, archiveTransaction, unarchiveTransaction, bulkArchiveTransactions, bulkAssign, splitTransaction } from '../api/transactions'
import { getMembers } from '../api/members'
import MemberSearchModal from '../components/MemberSearchModal'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import { HiEllipsisVertical, HiOutlineChevronDown } from 'react-icons/hi2'

export default function Transactions({
  initialArchivedFilter = 'active',
  isArchivedView = false,
  initialStatus = '',
  titleOverride,
  showAutoAssign = true,
}) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    status: initialStatus,
    search: '',
    member_id: '',
    sort_by: 'tran_date',
    sort_order: 'desc',
  })
  const [searchInput, setSearchInput] = useState('') // Local state for immediate UI update
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [archivedFilter, setArchivedFilter] = useState(initialArchivedFilter)
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
  const queryClient = useQueryClient()

  // Debounce search input - only trigger API call after user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }))
      setPage(1)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on a button inside the menu
      // Also don't close if clicking on modal overlays
      if (event.target.closest('button[type="button"]') || 
          event.target.closest('.fixed.z-50') ||
          event.target.closest('.fixed.z-40')) {
        return
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null)
      }
    }
    // Use a slight delay to allow button clicks to register first
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', filters, page, perPage, archivedFilter],
    queryFn: () => {
      const params = { ...filters, page, per_page: perPage }

      if (archivedFilter === 'archived') {
        params.archived = 1 // Send as numeric 1 for archived transactions
      } else if (archivedFilter === 'active') {
        params.archived = 0 // Send as numeric 0 for active transactions
      } else if (archivedFilter === 'all') {
        params.include_archived = 1 // Include both archived and active
      }

      return getTransactions(params)
    },
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', 'filter'],
    queryFn: () => getMembers({ per_page: 1000 }),
  })

  const resetTransferState = () => {
    setShowTransferModal(false)
  }


  const bulkAssignMutation = useMutation({
    mutationFn: ({ transactionIds, memberId }) => bulkAssign(transactionIds, memberId),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['members']) // Invalidate members to refresh balances
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

  const autoAssignMutation = useMutation({
    mutationFn: autoAssign,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['transactions'])
      const message = `Auto-assignment completed!\n\n` +
        `✅ Auto-assigned: ${data.auto_assigned}\n` +
        `⚠️ Draft assignments: ${data.draft_assigned}\n` +
        `❌ Remaining unassigned: ${data.unassigned}\n` +
        `📊 Total processed: ${data.total_processed}`
      alert(message)
    },
  })

  const transferMutation = useMutation({
    mutationFn: ({ id, toMemberId, recipients, notes }) => transferTransaction(id, { toMemberId, recipients, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['members']) // Invalidate members to refresh balances
      resetTransferState()
      alert('Transaction transferred successfully!')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to transfer transaction')
    },
  })

  const splitMutation = useMutation({
    mutationFn: ({ transactionId, splits, notes }) => splitTransaction(transactionId, { splits, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['members']) // Invalidate members to refresh balances
      resetTransferState()
      alert('Deposit shared successfully!')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to share deposit')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }) => {
      console.log('archiveMutation.mutationFn called - Archiving transaction:', id, 'reason:', reason)
      if (!id) {
        console.error('No transaction ID provided to archiveMutation')
        throw new Error('Transaction ID is required')
      }
      const result = archiveTransaction(id, reason)
      console.log('archiveTransaction call initiated, promise:', result)
      return result
    },
    onSuccess: (data) => {
      console.log('Archive success:', data)
      // Invalidate all transaction queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      alert(data?.message || 'Transaction archived successfully')
    },
    onError: (error) => {
      console.error('Archive error:', error)
      console.error('Archive error response:', error.response)
      console.error('Archive error message:', error.message)
      console.error('Archive error stack:', error.stack)
      alert(error.response?.data?.message || error.message || 'Failed to archive transaction')
    },
  })

  const unarchiveMutation = useMutation({
    mutationFn: (id) => {
      console.log('unarchiveMutation.mutationFn called with ID:', id)
      const result = unarchiveTransaction(id)
      console.log('unarchiveTransaction call initiated, promise:', result)
      return result
    },
    onSuccess: (data) => {
      console.log('Unarchive success:', data)
      queryClient.invalidateQueries(['transactions'])
      alert(data?.message || 'Transaction restored')
    },
    onError: (error) => {
      console.error('Unarchive error:', error)
      console.error('Unarchive error response:', error.response)
      console.error('Unarchive error message:', error.message)
      alert(error.response?.data?.message || error.message || 'Failed to restore transaction')
    },
  })

  const bulkArchiveMutation = useMutation({
    mutationFn: ({ ids, reason }) => bulkArchiveTransactions(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions'])
      setSelectedTransactions([])
      alert('Selected transactions archived')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to archive transactions')
    },
  })

  const handleAssignMemberSelect = (member) => {
    console.log('Member selected for assignment:', member)
    setSelectedMemberForAssign(member)
    setShowAssignModal(false)
    if (selectedTransactions.length === 0) {
      alert('Select at least one transaction to assign')
      return
    }
    console.log('Calling bulkAssignMutation with:', { transactionIds: selectedTransactions, memberId: member.id })
    bulkAssignMutation.mutate({
      transactionIds: selectedTransactions,
      memberId: member.id,
    })
  }

  const handleAutoAssign = () => {
    if (confirm('This will run auto-assignment on all unassigned transactions. Continue?')) {
      autoAssignMutation.mutate()
    }
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
    console.log('handleTransfer called with transaction:', transaction)
    setSelectedTransaction(transaction)
    setSelectedMemberForTransfer(null)
    setTransferNotes('')
    const shouldUseShareMode = !transaction.member_id // Default to share mode if unassigned
    setIsShareMode(shouldUseShareMode)
    if (shouldUseShareMode) {
      initializeShareEntriesForTransaction(transaction)
    } else {
      setShareEntries([])
    }
    setActiveShareIndex(null)
    setShowTransferModal(true)
    console.log('Transfer modal should now be open, showTransferModal:', true)
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

      // Use transfer endpoint with multiple recipients
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
    console.log('=== handleArchive START ===')
    console.log('handleArchive called with transaction:', transaction)
    console.log('Transaction ID:', transaction?.id)
    
    if (archiveMutation.isPending) {
      console.log('Archive mutation is already pending, skipping')
      alert('Archive operation already in progress')
      return
    }

    if (!transaction) {
      console.error('No transaction provided')
      alert('Error: No transaction data')
      return
    }

    if (!transaction.id) {
      console.error('Invalid transaction - no ID:', transaction)
      alert('Error: Transaction ID not found')
      return
    }

    console.log('Showing prompt for archive reason')
    const reason = prompt('Enter a reason for archiving (optional):')
    console.log('Prompt result:', reason, 'Type:', typeof reason)
    
    // If user cancels, prompt returns null, so we exit
    if (reason === null) {
      console.log('User cancelled archive prompt')
      return
    }

    // Trim the reason if provided, otherwise use undefined
    const trimmedReason = reason ? reason.trim() : undefined
    const mutationPayload = { id: transaction.id, reason: trimmedReason }
    console.log('Calling archiveMutation.mutate with:', mutationPayload)
    console.log('Archive mutation object:', archiveMutation)

    try {
      archiveMutation.mutate(mutationPayload)
      console.log('archiveMutation.mutate called successfully')
    } catch (error) {
      console.error('Error calling archiveMutation.mutate:', error)
      alert('Error: ' + (error.message || 'Failed to initiate archive'))
    }
    console.log('=== handleArchive END ===')
  }

  const handleBulkArchive = () => {
    if (bulkArchiveMutation.isPending || selectedTransactions.length === 0 || isArchivedView) {
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
    console.log('handleUnarchive called with transaction:', transaction)
    
    if (unarchiveMutation.isPending) {
      console.log('Unarchive already in progress')
      return
    }

    if (!transaction || !transaction.id) {
      console.error('Invalid transaction in handleUnarchive:', transaction)
      alert('Error: Invalid transaction data')
      return
    }

    if (!confirm('Restore this transaction?')) {
      console.log('User cancelled restore')
      return
    }

    console.log('Calling unarchiveMutation.mutate with ID:', transaction.id)
    unarchiveMutation.mutate(transaction.id)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading transactions: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const pageTitle = titleOverride ?? (isArchivedView ? 'Archived Transactions' : 'Transactions')

  // Handle Laravel paginated response structure
  // Laravel paginator returns: { data: [...], current_page: 1, last_page: 5, ... }
  const transactions = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
  const pagination = data && !Array.isArray(data) ? data : {}
  const selectableTransactionIds = transactions
    .filter((tx) => !tx.is_archived)
    .map((tx) => tx.id)
  const archivingId = archiveMutation.variables?.id
  const unarchivingId = unarchiveMutation.variables
  

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description="View and manage all financial transactions"
        metric={pagination?.total || 0}
        metricLabel="Total Transactions"
        gradient="from-green-600 to-emerald-600"
      />

      {!isArchivedView && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAutoAssign}
              disabled={autoAssignMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {autoAssignMutation.isPending ? 'Processing...' : '✨ Auto Assign'}
            </button>
            <button
              onClick={() => {
                if (selectedTransactions.length === 0) {
                  alert('Please select at least one transaction using the checkboxes')
                  return
                }
                setShowAssignModal(true)
              }}
              disabled={bulkAssignMutation.isPending || selectedTransactions.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title={selectedTransactions.length === 0 ? 'Select transactions using checkboxes to enable bulk assign' : ''}
            >
              {bulkAssignMutation.isPending ? 'Assigning...' : `👥 Bulk Assign${selectedTransactions.length > 0 ? ` (${selectedTransactions.length})` : ''}`}
            </button>
            <button
              onClick={() => {
                if (selectedTransactions.length === 0) {
                  alert('Please select at least one transaction using the checkboxes')
                  return
                }
                handleBulkArchive()
              }}
              disabled={bulkArchiveMutation.isPending || selectedTransactions.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title={selectedTransactions.length === 0 ? 'Select transactions using checkboxes to enable bulk archive' : ''}
            >
              {bulkArchiveMutation.isPending ? 'Archiving...' : `🗄️ Bulk Archive${selectedTransactions.length > 0 ? ` (${selectedTransactions.length})` : ''}`}
            </button>
            {selectedTransactions.length > 0 && (
              <button
                onClick={() => setSelectedTransactions([])}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Clear selection"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4">
        <div className={`grid grid-cols-1 ${isArchivedView ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
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
              <option value="duplicate">Duplicate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
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
          {!isArchivedView ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Archived</label>
              <select
                value={archivedFilter}
                onChange={(e) => {
                  setArchivedFilter(e.target.value)
                  setPage(1)
                  setSelectedTransactions([])
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
                <option value="all">All (Include Archived)</option>
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <span className="text-sm text-gray-500">Showing archived transactions only</span>
            </div>
          )}
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Type</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Code</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[300px]">Particulars</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Statement</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <div className="flex items-center gap-1">
                    <span>Amount</span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          setFilters({ ...filters, sort_by: 'credit', sort_order: 'desc' })
                          setPage(1)
                        }}
                        className={`text-xs leading-none ${filters.sort_by === 'credit' && filters.sort_order === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`}
                        title="Sort: Highest to Lowest"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          setFilters({ ...filters, sort_by: 'credit', sort_order: 'asc' })
                          setPage(1)
                        }}
                        className={`text-xs leading-none ${filters.sort_by === 'credit' && filters.sort_order === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`}
                        title="Sort: Lowest to Highest"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <span>Member</span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          setFilters({ ...filters, sort_by: 'member_name', sort_order: 'asc' })
                          setPage(1)
                        }}
                        className={`text-xs leading-none ${filters.sort_by === 'member_name' && filters.sort_order === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`}
                        title="Sort: A to Z"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => {
                          setFilters({ ...filters, sort_by: 'member_name', sort_order: 'desc' })
                          setPage(1)
                        }}
                        className={`text-xs leading-none ${filters.sort_by === 'member_name' && filters.sort_order === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`}
                        title="Sort: Z to A"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Status</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-sm text-gray-500">
                    {isArchivedView 
                      ? 'No archived transactions found.' 
                      : filters.status || filters.search || filters.member_id 
                        ? 'No transactions found. Try adjusting your filters.' 
                        : 'No transactions found. Upload a bank statement to get started.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-gray-50 ${tx.is_archived ? 'bg-gray-50 text-gray-500' : ''}`}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(tx.id)}
                        onChange={(e) => {
                          if (tx.is_archived) {
                            return
                          }
                          if (e.target.checked) {
                            setSelectedTransactions([...new Set([...selectedTransactions, tx.id])])
                          } else {
                            setSelectedTransactions(selectedTransactions.filter(id => id !== tx.id))
                          }
                        }}
                        disabled={tx.is_archived}
                        title={tx.is_archived ? 'Archived transactions cannot be selected' : undefined}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900">
                      <div className="whitespace-nowrap">
                        {new Date(tx.tran_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        {tx.transaction_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500 hidden lg:table-cell">
                      {tx.transaction_code || '-'}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900">
                      <div className="min-w-[300px] max-w-2xl break-words whitespace-normal" title={tx.particulars}>
                        {tx.particulars}
                      </div>
                      <div className="md:hidden mt-1 flex flex-wrap gap-1">
                        {tx.transaction_type && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            {tx.transaction_type}
                          </span>
                        )}
                        {tx.member?.name && (
                          <button
                            onClick={() => navigate(`/members/${tx.member.id}?highlight=${tx.id}`)}
                            className="text-xs text-indigo-600 hover:text-indigo-900 hover:underline"
                          >
                            {tx.member.name}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500 hidden xl:table-cell">
                      {tx.bank_statement ? (
                        <div className="max-w-xs">
                          <div className="truncate font-medium text-gray-900" title={tx.bank_statement.filename}>
                            {tx.bank_statement.filename || `Stmt #${tx.bank_statement.id}`}
                          </div>
                          <div className="text-xs text-gray-400">#{tx.bank_statement.id}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(tx.credit || tx.debit || 0)}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                      {tx.member?.id ? (
                        <button
                          onClick={() => navigate(`/members/${tx.member.id}?highlight=${tx.id}`)}
                          className="max-w-xs truncate text-indigo-600 hover:text-indigo-900 hover:underline text-left"
                          title={`View ${tx.member.name}'s statement`}
                        >
                          {tx.member.name}
                        </button>
                      ) : (
                        <div className="max-w-xs truncate">
                          -
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 hidden lg:table-cell">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                        tx.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                        tx.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                        tx.assignment_status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        tx.assignment_status === 'duplicate' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.assignment_status}
                      </span>
                      {tx.is_archived && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="relative inline-block" ref={actionMenuRef}>
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === tx.id ? null : tx.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                          title="Actions"
                        >
                          <HiEllipsisVertical className="h-5 w-5" />
                        </button>
                        {actionMenuOpen === tx.id && (
                          <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              {tx.is_archived ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('=== Restore button clicked ===')
                                    console.log('Event:', e)
                                    console.log('Transaction:', tx)
                                    console.log('Transaction ID:', tx.id)
                                    
                                    const transactionId = tx.id
                                    if (!transactionId) {
                                      console.error('No transaction ID found')
                                      alert('Error: Transaction ID not found')
                                      setActionMenuOpen(null)
                                      return
                                    }
                                    
                                    // Close menu first to prevent click outside handler from interfering
                                    setActionMenuOpen(null)
                                    
                                    // Use requestAnimationFrame to ensure menu closes before confirm
                                    requestAnimationFrame(() => {
                                      console.log('Calling handleUnarchive with transaction:', tx)
                                      handleUnarchive(tx)
                                    })
                                  }}
                                  disabled={unarchiveMutation.isPending && unarchivingId === tx.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {unarchiveMutation.isPending && unarchivingId === tx.id ? 'Restoring...' : 'Restore'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('Assign button clicked for transaction:', tx.id)
                                      setSelectedTransactions([tx.id])
                                      setShowAssignModal(true)
                                      setActionMenuOpen(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100"
                                  >
                                    {tx.member_id ? 'Reassign' : 'Assign'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('Transfer/Share button clicked for transaction:', tx.id)
                                      handleTransfer(tx)
                                      setActionMenuOpen(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-gray-100"
                                  >
                                    {tx.member_id ? 'Transfer/Share' : 'Assign/Share'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('=== Archive button clicked ===')
                                      console.log('Event:', e)
                                      console.log('Transaction:', tx)
                                      console.log('Transaction ID:', tx.id)
                                      
                                      const transactionId = tx.id
                                      if (!transactionId) {
                                        console.error('No transaction ID found')
                                        alert('Error: Transaction ID not found')
                                        setActionMenuOpen(null)
                                        return
                                      }
                                      
                                      // Close menu first to prevent click outside handler from interfering
                                      setActionMenuOpen(null)
                                      
                                      // Use requestAnimationFrame to ensure menu closes before prompt
                                      requestAnimationFrame(() => {
                                        console.log('Calling handleArchive with transaction:', tx)
                                        handleArchive(tx)
                                      })
                                    }}
                                    disabled={archiveMutation.isPending && archivingId === tx.id}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    {archiveMutation.isPending && archivingId === tx.id ? 'Archiving...' : 'Archive'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                  current_page: pagination.current_page || data?.current_page || page,
                  last_page: pagination.last_page || data?.last_page || 1,
                  per_page: perPage,
                  total: pagination.total || data?.total || 0,
                }}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          </div>
        )}
      </div>


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
                        disabled={transferMutation.isPending || splitMutation.isPending}
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
      {!isArchivedView && (
        <MemberSearchModal
          isOpen={isTransferSearchOpen}
          onClose={() => {
            setIsTransferSearchOpen(false)
            setActiveShareIndex(null)
          }}
          onSelect={handleTransferMemberSelect}
          title={isShareMode ? 'Select member to share with' : 'Transfer Transaction to Member'}
        />
      )}
    </div>
  )
}

