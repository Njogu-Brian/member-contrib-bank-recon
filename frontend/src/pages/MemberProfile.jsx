import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMember, updateMember, getMemberStatement, exportMemberStatement } from '../api/members'
import { getMemberAuditResults } from '../api/audit'
import MemberSearchModal from '../components/MemberSearchModal'
import { transferTransaction, splitTransaction, bulkAssign } from '../api/transactions'
import Pagination from '../components/Pagination'
import { HiEllipsisVertical } from 'react-icons/hi2'

const buildStatusBadgeStyle = (hex) => {
  if (!hex) return {}
  let normalized = hex.trim()
  if (!normalized.startsWith('#')) {
    normalized = `#${normalized}`
  }
  if (normalized.length === 4) {
    normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
  }
  if (normalized.length !== 7) {
    return { color: normalized }
  }
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return {
    color: `rgb(${r}, ${g}, ${b})`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
  }
}

export default function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightTransactionId = searchParams.get('highlight')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState('statement')
  const [formData, setFormData] = useState({})
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningTransaction, setAssigningTransaction] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState(null)
  const [transferNotes, setTransferNotes] = useState('')
  const [isTransferSearchOpen, setIsTransferSearchOpen] = useState(false)
  const [isShareMode, setIsShareMode] = useState(false)
  const [shareEntries, setShareEntries] = useState([])
  const [activeShareIndex, setActiveShareIndex] = useState(null)
  const [selectedMonthDetail, setSelectedMonthDetail] = useState(null)
  const [exportingFormat, setExportingFormat] = useState(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(null)
  const actionMenuRef = useRef(null)
  const highlightedRowRef = useRef(null)
  const queryClient = useQueryClient()

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => getMember(id),
    enabled: !!id,
  })

  const { data: statementData, isLoading: isStatementLoading } = useQuery({
    queryKey: ['member-statement', id, page, perPage],
    queryFn: () => getMemberStatement(id, { page, per_page: perPage }),
    enabled: !!id,
  })

  const { data: auditData } = useQuery({
    queryKey: ['member-audits', id],
    queryFn: () => getMemberAuditResults(id),
    enabled: !!id,
  })

  const {
    data: monthDetailData,
    isFetching: isMonthDetailFetching,
    isError: isMonthDetailError,
    error: monthDetailError,
  } = useQuery({
    queryKey: ['member-statement', id, 'month-detail', selectedMonthDetail?.monthKey],
    queryFn: () => getMemberStatement(id, { month: selectedMonthDetail?.monthKey, per_page: 500 }),
    enabled: !!selectedMonthDetail?.monthKey,
  })

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

  // Scroll to and highlight transaction if specified in URL
  useEffect(() => {
    if (highlightTransactionId && highlightedRowRef.current && statementData) {
      setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
      // Remove highlight param after 5 seconds
      setTimeout(() => {
        const params = new URLSearchParams(searchParams)
        params.delete('highlight')
        setSearchParams(params, { replace: true })
      }, 5000)
    }
  }, [highlightTransactionId, statementData, searchParams, setSearchParams])

  const resetTransferState = () => {
    setShowTransferModal(false)
    setSelectedTransaction(null)
    setSelectedMemberForTransfer(null)
    setTransferNotes('')
    setIsShareMode(false)
    setShareEntries([])
    setActiveShareIndex(null)
    setIsTransferSearchOpen(false)
  }

  const updateMutation = useMutation({
    mutationFn: (data) => updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['member', id])
      setShowEditModal(false)
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ transactionId, memberId }) => bulkAssign([transactionId], memberId),
    onSuccess: () => {
      queryClient.invalidateQueries(['member-statement', id, page])
      setShowAssignModal(false)
      setAssigningTransaction(null)
      alert('Transaction reassigned successfully!')
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to reassign transaction'),
  })

  const transferMutation = useMutation({
    mutationFn: ({ id, toMemberId, notes }) => transferTransaction(id, toMemberId, notes),
    onSuccess: () => {
    queryClient.invalidateQueries(['member-statement', id, page])
    resetTransferState()
    alert('Transaction transferred successfully!')
  },
    onError: (error) => alert(error.response?.data?.message || 'Failed to transfer transaction'),
  })

  const splitMutation = useMutation({
    mutationFn: ({ transactionId, splits }) => splitTransaction(transactionId, splits),
    onSuccess: () => {
    queryClient.invalidateQueries(['member-statement', id, page])
    resetTransferState()
    alert('Deposit shared successfully!')
  },
    onError: (error) => alert(error.response?.data?.message || 'Failed to share deposit'),
  })

  const handleEdit = () => {
    if (member) {
      setFormData({
        name: member.name || '',
        phone: member.phone || '',
        email: member.email || '',
        member_code: member.member_code || '',
        member_number: member.member_number || '',
        notes: member.notes || '',
        is_active: member.is_active ?? true,
      })
      setShowEditModal(true)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!member) {
    return <div className="text-center py-12">Member not found</div>
  }

  const contributionStatusLabel = member.contribution_status_label || member.contribution_status || 'Unknown'
  const contributionStatusStyle = buildStatusBadgeStyle(member.contribution_status_color || '#6b7280')
  const formatDate = (value) =>
    value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : '-'

  const pagination = statementData?.pagination || { current_page: 1, last_page: 1 }
  const monthlyTotals = statementData?.monthly_totals || []
  const statementEntries = statementData?.statement || []
  
  // Helper to get amount from entry (handles both amount property and credit/debit)
  const getEntryAmount = (entry) => {
    if (entry.amount !== undefined) return Number(entry.amount)
    return Number(entry.credit || 0) - Number(entry.debit || 0)
  }
  
  const monthDetailEntries = selectedMonthDetail
    ? (monthDetailData?.statement || []).filter((entry) => getEntryAmount(entry) > 0)
    : []
  const monthDetailTotal = monthDetailEntries.reduce((sum, entry) => sum + getEntryAmount(entry), 0)

  const handleTransactionTransfer = (entry) => {
    if (!entry.transaction_id || !entry.member_id) {
      alert('Only assigned transactions can be transferred.')
      return
    }
    setSelectedTransaction({
      id: entry.transaction_id,
      member_id: entry.member_id,
      credit: entry.amount > 0 ? entry.amount : 0,
      debit: entry.amount < 0 ? Math.abs(entry.amount) : 0,
    })
    setSelectedMemberForTransfer(null)
    setTransferNotes('')
    setIsShareMode(false)
    setShareEntries([])
    setActiveShareIndex(null)
    setShowTransferModal(true)
  }

  const handleTransactionReassign = (entry) => {
    if (!entry.transaction_id) {
      alert('Only system transactions can be reassigned.')
      return
    }
    setAssigningTransaction(entry)
    setShowAssignModal(true)
  }

  const handleAssignMemberSelect = (member) => {
    if (!member || !assigningTransaction) return
    assignMutation.mutate({
      transactionId: assigningTransaction.transaction_id,
      memberId: member.id,
    })
  }

  const handleTransferSubmit = () => {
    if (!selectedTransaction) return

    if (isShareMode) {
      if (shareEntries.length === 0) {
        alert('Add at least one member to share with')
        return
      }
      const totalAmount = shareEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0)
      const transactionAmount = Number(selectedTransaction.credit || selectedTransaction.debit || 0)
      if (shareEntries.some((entry) => !entry.member?.id || !entry.amount || Number(entry.amount) <= 0)) {
        alert('Each share entry must have a member and a positive amount')
        return
      }
      if (Math.abs(totalAmount - transactionAmount) > 0.01) {
        alert('Shared amounts must add up exactly to the transaction total')
        return
      }
      const splitsPayload = shareEntries.map((entry) => ({
        member_id: entry.member.id,
        amount: Number(entry.amount),
        notes: transferNotes || undefined,
      }))
      splitMutation.mutate({ transactionId: selectedTransaction.id, splits: splitsPayload })
      return
    }

    if (!selectedMemberForTransfer) {
      alert('Select a member to transfer to')
      return
    }
    if (selectedMemberForTransfer.id === selectedTransaction.member_id) {
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
        prev.map((entry, idx) => (idx === activeShareIndex ? { ...entry, member } : entry))
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

  const handleAddShareEntry = () => {
    setShareEntries((prev) => [...prev, { member: null, amount: '' }])
  }

  const handleShareAmountChange = (index, value) => {
    setShareEntries((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, amount: value } : entry)))
  }

  const handleRemoveShareEntry = (index) => {
    setShareEntries((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleExportStatement = async (format) => {
    if (!member) return
    try {
      setExportingFormat(format)
      const response = await exportMemberStatement(member.id, { format })
      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          (format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'),
      })

      const disposition = response.headers['content-disposition']
      let filename = `${member.name || 'member'}-statement.${format === 'excel' ? 'xlsx' : 'pdf'}`
      if (disposition) {
        const match = /filename="?([^"]+)"?/i.exec(disposition)
        if (match?.[1]) {
          filename = match[1]
        }
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to export statement')
    } finally {
      setExportingFormat(null)
    }
  }

  const handleMonthDetailRequest = (monthKey, label) => {
    if (!monthKey) {
      alert('Detailed contributions are only available for specific year-month combinations.')
      return
    }
    setSelectedMonthDetail({
      monthKey,
      label,
    })
  }

  const closeMonthDetailModal = () => {
    setSelectedMonthDetail(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate('/members')}
            className="text-gray-500 hover:text-gray-700 mb-2"
          >
            ← Back to Members
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{member.name}</h1>
        </div>
        <button
          onClick={handleEdit}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Edit Member
        </button>
      </div>

      {/* Member Info Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Member Information</h2>
        
        {/* Profile Completion Alert */}
        {!member.profile_completed_at && (
          <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
            <p className="text-sm text-amber-800">
              ⚠️ <strong>Profile Incomplete:</strong> Member needs to complete profile to access statements.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Phone Number</label>
            <p className="text-gray-900 font-semibold">{member.phone || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">WhatsApp Number</label>
            <p className="text-gray-900">{member.secondary_phone || <span className="text-gray-400">Not set</span>}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-900">{member.email || <span className="text-gray-400">Not set</span>}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">ID Number</label>
            <p className="text-gray-900 font-semibold text-lg">{member.id_number || <span className="text-gray-400">Not set</span>}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Church</label>
            <p className="text-gray-900">{member.church || <span className="text-gray-400">Not set</span>}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Member Number</label>
            <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{member.member_number || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Date of Registration</label>
            <p className="text-gray-900">{formatDate(member.date_of_registration)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          {member.profile_completed_at && (
            <div>
              <label className="text-sm font-medium text-gray-500">Profile Completed</label>
              <p className="text-gray-900">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  ✓ {formatDate(member.profile_completed_at)}
                </span>
              </p>
            </div>
          )}
        </div>
        {member.notes && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-500">Notes</label>
            <p className="text-gray-900">{member.notes}</p>
          </div>
        )}
      </div>

      {/* Contribution Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Contribution Summary</h2>
          {member.date_of_registration && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Member Since:</span>{' '}
              {new Date(member.date_of_registration).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Total Contributions</label>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(member.total_contributions || 0)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Total Invoices</label>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(member.expected_contributions || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Based on issued invoices
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Difference</label>
            <p className={`text-2xl font-bold ${
              (member.total_contributions || 0) >= (member.expected_contributions || 0) 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                (member.total_contributions || 0) - (member.expected_contributions || 0)
              )}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Contribution Status</label>
            <p>
              <span
                className="inline-flex px-3 py-1 text-sm font-semibold rounded-full border"
                style={contributionStatusStyle}
              >
                {contributionStatusLabel}
              </span>
            </p>
          </div>
          {statementData?.summary?.total_expenses > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Total Expenses</label>
              <p className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(statementData?.summary?.total_expenses || 0))}
              </p>
            </div>
          )}
          {statementData?.summary?.pending_invoices > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Pending Invoices</label>
              <p className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(statementData?.summary?.pending_invoices || 0))}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'statement', label: 'Statement View' },
            { id: 'audit', label: 'Audit View' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Statement */}
      {activeTab === 'statement' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Member Statement</h2>
              {isStatementLoading && <span className="text-sm text-gray-500">Loading...</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportStatement('pdf')}
                disabled={!!exportingFormat}
                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {exportingFormat === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}
              </button>
              <button
                type="button"
                onClick={() => handleExportStatement('excel')}
                disabled={!!exportingFormat}
                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {exportingFormat === 'excel' ? 'Preparing Excel…' : 'Export Excel'}
              </button>
            </div>
          </div>
          {statementData ? (
            <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Monthly Totals</h3>
                  <span className="text-xs text-gray-500">Click a month</span>
                </div>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Contributions</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyTotals.map((month) => (
                      <tr
                        key={month.label}
                        className="cursor-pointer hover:bg-indigo-50"
                        onClick={() => handleMonthDetailRequest(month.month_key, month.label)}
                        title="View this month's contributions"
                      >
                        <td className="px-4 py-2 text-gray-900">{month.label}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(month.contributions || 0))}
                        </td>
                        <td className="px-4 py-2 text-right text-red-600">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(month.expenses || 0))}
                        </td>
                        <td className={`px-4 py-2 text-right font-medium ${(month.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(month.net || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-2 border rounded-lg">
              <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Transactions</h3>
                <span className="text-xs text-gray-500">
                  Page {pagination?.current_page || 1} of {pagination?.last_page || 1}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Statement</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Reference</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statementEntries.map((item, idx) => {
                      const isHighlighted = highlightTransactionId && item.transaction_id && item.transaction_id.toString() === highlightTransactionId
                      return (
                      <tr 
                        key={idx} 
                        ref={isHighlighted ? highlightedRowRef : null}
                        className={`hover:bg-gray-50 transition-colors duration-300 ${isHighlighted ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}`}
                      >
                        <td className="px-2 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500">
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                            item.type === 'contribution'
                              ? 'bg-green-100 text-green-800'
                              : item.type === 'shared_contribution'
                              ? 'bg-purple-100 text-purple-800'
                              : item.type === 'expense'
                              ? 'bg-red-100 text-red-800'
                              : item.type === 'invoice'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.type === 'contribution'
                              ? 'Contribution'
                              : item.type === 'shared_contribution'
                              ? 'Shared'
                              : item.type === 'expense'
                              ? 'Expense'
                              : item.type === 'invoice'
                              ? 'Invoice'
                              : 'Manual'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={item.description}>
                            {item.description}
                          </div>
                          <div className="md:hidden mt-1 text-xs text-gray-500">
                            {item.reference && <span>Ref: {item.reference}</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500 hidden lg:table-cell">
                          {item.statement_id ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/statements/${item.statement_id}`)}
                              className="text-indigo-600 hover:text-indigo-900 underline text-xs max-w-xs truncate block"
                              title={item.statement_name || `Statement #${item.statement_id}`}
                            >
                              {item.statement_name || `Stmt #${item.statement_id}`}
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                          <div className="max-w-xs truncate" title={item.reference}>
                            {item.reference || '-'}
                          </div>
                        </td>
                        <td className={`px-2 py-2 text-sm font-semibold text-right whitespace-nowrap ${
                          getEntryAmount(item) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(getEntryAmount(item))}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {item.transaction_id && !item.is_split ? (
                            <div className="relative inline-block" ref={actionMenuRef}>
                              <button
                                onClick={() => setActionMenuOpen(actionMenuOpen === idx ? null : idx)}
                                className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                title="Actions"
                              >
                                <HiEllipsisVertical className="h-5 w-5" />
                              </button>
                              {actionMenuOpen === idx && (
                                <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        handleTransactionReassign(item)
                                        setActionMenuOpen(null)
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100"
                                    >
                                      Reassign
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleTransactionTransfer(item)
                                        setActionMenuOpen(null)
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-gray-100"
                                    >
                                      Transfer
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {item.is_split ? 'Shared' : 'Manual'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {(pagination?.last_page || 1) > 1 && (
            <div className="mt-6 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
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
                    current_page: pagination?.current_page || page,
                    last_page: pagination?.last_page || 1,
                    per_page: perPage,
                    total: pagination?.total ?? statementData?.pagination?.total ?? statementEntries.length,
                  }}
                  onPageChange={(newPage) => {
                    if (newPage >= 1 && newPage <= (pagination?.last_page || 1)) {
                      setPage(newPage)
                    }
                  }}
                />
              </div>
            </div>
          )}
          {statementEntries.some((item) => item.type === 'expense') && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Recorded Expenses</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statementEntries
                      .filter((item) => item.type === 'expense')
                      .map((item, idx) => (
                        <tr key={`expense-${idx}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{item.reference || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-red-600">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Math.abs(getEntryAmount(item)))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Statement data is not available.</p>
          )}
        </div>
      )}

      {/* Audit Results */}
      {activeTab === 'audit' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Audit Comparison</h2>
            <Link to="/audit" className="text-sm text-indigo-600 hover:text-indigo-800">
              Go to Audits
            </Link>
          </div>
          {auditData?.audits?.length ? (
            <div className="space-y-6">
              {auditData.audits.map((audit) => (
                <div key={`${audit.run_id}-${audit.year}`} className="border rounded-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {audit.year ? `Audit ${audit.year}` : 'Audit'} • Run #{audit.run_id}
                    </p>
                    <p className="text-xs text-gray-500">{audit.uploaded_at || 'Not timestamped'}</p>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      audit.status === 'pass'
                        ? 'bg-green-100 text-green-800'
                        : audit.status === 'fail'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {audit.status}
                  </span>
                </div>
                <div className="px-6 py-4 space-y-4">
                  {audit.views?.map((view, idx) => (
                    <div key={`${audit.run_id}-${idx}`} className="border rounded-lg">
                      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">{view.label || 'View'}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Expected: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(view.expected || 0))}</span>
                          <span>Actual: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(view.actual || 0))}</span>
                          <span className={(view.difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Diff: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(view.difference || 0))}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {view.months?.map((month) => (
                              <tr key={`${audit.run_id}-${view.label}-${month.month}`}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  <button
                                    type="button"
                                    onClick={() => handleMonthDetailRequest(month.month_key, `${month.month} ${view.label}`)}
                                    className={`${
                                      month.month_key ? 'text-indigo-600 hover:text-indigo-800 underline' : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                    disabled={!month.month_key}
                                    title={month.month_key ? 'View contributions for this month' : 'Not available for aggregated totals'}
                                  >
                                    {month.month}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">
                                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(month.expected || 0))}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">
                                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(month.actual || 0))}
                                </td>
                                <td className={`px-4 py-2 text-sm text-right font-medium ${
                                  (month.difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(month.difference || 0))}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {month.matches ? (
                                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Matched</span>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Mismatch</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No audit records found for this member yet.</p>
        )}
        </div>
      )}

      {selectedMonthDetail && (
        <div
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4"
          onClick={closeMonthDetailModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monthly Contributions</h3>
                <p className="text-sm text-gray-500">
                  {member.name} • {selectedMonthDetail.label}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMonthDetailModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {isMonthDetailError ? (
                <div className="text-center py-12 text-red-600">
                  Failed to load contributions{' '}
                  {monthDetailError?.response?.data?.message ? `: ${monthDetailError.response.data.message}` : ''}
                </div>
              ) : isMonthDetailFetching ? (
                <div className="text-center py-12 text-gray-500">Loading contributions...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Showing {monthDetailEntries.length} contribution{monthDetailEntries.length === 1 ? '' : 's'}
                    </span>
                    <span className="font-semibold text-gray-900">
                      Total:{' '}
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(monthDetailTotal || 0))}
                    </span>
                  </div>
                  {monthDetailEntries.length ? (
                    <div className="overflow-x-auto max-h-[60vh]">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statement</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                          {monthDetailEntries.map((entry, idx) => (
                            <tr key={`${selectedMonthDetail.monthKey}-${idx}`}>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                                {new Date(entry.date).toLocaleDateString('en-GB')}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-500 capitalize">
                                {entry.type?.replace('_', ' ') || 'Contribution'}
                              </td>
                              <td className="px-4 py-2 text-gray-900">{entry.description}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {entry.statement_id ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/statements/${entry.statement_id}`)
                                      closeMonthDetailModal()
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900 underline"
                                  >
                                    {entry.statement_name || `Statement #${entry.statement_id}`}
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-green-600">
                                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(
                                  getEntryAmount(entry)
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">No contributions recorded for this month.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <MemberSearchModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setAssigningTransaction(null)
        }}
        onSelect={handleAssignMemberSelect}
        title="Select Member to Reassign"
      />

      {/* Transfer Member Search */}
      <MemberSearchModal
        isOpen={isTransferSearchOpen}
        onClose={() => {
          setIsTransferSearchOpen(false)
          setActiveShareIndex(null)
        }}
        onSelect={handleTransferMemberSelect}
        title={isShareMode ? 'Select members to share with' : 'Transfer Transaction to Member'}
      />

      {/* Transfer Modal */}
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Transfer Transaction</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Amount:{' '}
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(selectedTransaction.credit || selectedTransaction.debit || 0)}
                    </p>
                    <div className="mt-4">
                      <label className="flex items-center text-sm text-gray-700 space-x-2">
                        <input
                          type="checkbox"
                          checked={isShareMode}
                          onChange={(e) => {
                            setIsShareMode(e.target.checked)
                            if (e.target.checked) {
                              setShareEntries([
                                {
                                  member: null,
                                  amount: (selectedTransaction.credit || selectedTransaction.debit || 0).toFixed(2),
                                },
                              ])
                            } else {
                              setShareEntries([])
                              setActiveShareIndex(null)
                            }
                            setSelectedMemberForTransfer(null)
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Share this deposit among multiple members</span>
                      </label>
                    </div>
                    {isShareMode ? (
                      <div className="mt-4 space-y-4">
                        {shareEntries.map((entry, index) => (
                          <div key={index} className="flex items-center space-x-4">
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
                            <div className="w-32">
                              <label className="block text-sm font-medium text-gray-700">Amount</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={entry.amount}
                                onChange={(e) => handleShareAmountChange(index, e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveShareEntry(index)}
                              className="text-sm text-red-600 hover:text-red-800 mt-5"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
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
                          ? (splitMutation.isPending ? 'Sharing...' : 'Share Deposit')
                          : (transferMutation.isPending ? 'Transferring...' : 'Transfer')}
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Edit Member</h3>
                
                {/* Profile Completion Info */}
                <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <p className="text-xs text-blue-800">
                    <strong>Profile Completion Fields:</strong> Name, Phone, Email, ID Number, and Church are required for members to view statements.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="+254712345678"
                    />
                    <p className="mt-1 text-xs text-gray-500">Format: +254712345678 (with country code)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                    <input
                      type="text"
                      value={formData.secondary_phone || ''}
                      onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="+254723456789 (optional)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Optional, with country code</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="email@example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">Valid email format required</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Number *</label>
                    <input
                      type="text"
                      value={formData.id_number || ''}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="12345678"
                    />
                    <p className="mt-1 text-xs text-gray-500">Digits only, minimum 5 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Church *</label>
                    <input
                      type="text"
                      value={formData.church || ''}
                      onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Church name"
                    />
                    <p className="mt-1 text-xs text-gray-500">Required for profile completion</p>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">System Information</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Number</label>
                    <input
                      type="text"
                      value={formData.member_number || ''}
                      onChange={(e) => setFormData({ ...formData, member_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Auto-generated"
                    />
                    <p className="mt-1 text-xs text-gray-500">System reference number (optional)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Internal notes visible only to administrators"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

