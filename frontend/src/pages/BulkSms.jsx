import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers } from '../api/members'
import { sendBulkSms, getSmsLogs, getSmsStatistics } from '../api/sms'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import { HiEnvelope, HiCheckCircle, HiXCircle, HiCalendar } from 'react-icons/hi2'

export default function BulkSms() {
  const [selectedMembers, setSelectedMembers] = useState([])
  const [message, setMessage] = useState('')
  const [senderId, setSenderId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [activeTab, setActiveTab] = useState('compose')
  const [includeContributionStatus, setIncludeContributionStatus] = useState(false)
  const [includeStatementLink, setIncludeStatementLink] = useState(false)
  const [customNumbers, setCustomNumbers] = useState('')
  const [showCustomNumbers, setShowCustomNumbers] = useState(false)
  const [expandedMessageId, setExpandedMessageId] = useState(null)

  const queryClient = useQueryClient()

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'sms', searchTerm, page],
    queryFn: () => getMembers({ search: searchTerm, per_page: 50, page }),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-logs', logsPage],
    queryFn: () => getSmsLogs({ page: logsPage, per_page: 25 }),
    enabled: activeTab === 'logs',
  })

  const { data: statsData } = useQuery({
    queryKey: ['sms-statistics'],
    queryFn: () => getSmsStatistics(),
    enabled: activeTab === 'logs',
  })

  const sendMutation = useMutation({
    mutationFn: ({ memberIds, customNumbers, message, senderId, includeContributionStatus, includeStatementLink }) => 
      sendBulkSms(memberIds, message, senderId, customNumbers, includeContributionStatus, includeStatementLink),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['sms-logs'])
      queryClient.invalidateQueries(['sms-statistics'])
      setSelectedMembers([])
      setMessage('')
      setCustomNumbers('')
      setIncludeContributionStatus(false)
      setIncludeStatementLink(false)
      alert(`SMS sent successfully!\n\nSent: ${data.results?.success || 0}\nFailed: ${data.results?.failed || 0}\nTotal: ${data.results?.total || 0}`)
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to send SMS')
    },
  })

  const members = membersData?.data || []
  const pagination = membersData?.meta || {}
  const logs = logsData?.data || []
  const logsPagination = logsData?.meta || {}

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const toggleSelectAll = () => {
    const selectableIds = members.filter((m) => m.is_active && m.phone).map((m) => m.id)
    if (selectableIds.every((id) => selectedMembers.includes(id))) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(selectableIds)
    }
  }

  const handleSend = () => {
    const customNumbersArray = customNumbers
      .split(/[,\n]/)
      .map(num => num.trim())
      .filter(num => num.length > 0)

    if (selectedMembers.length === 0 && customNumbersArray.length === 0) {
      alert('Please select at least one member or enter custom phone numbers')
      return
    }
    if (!message.trim()) {
      alert('Please enter a message')
      return
    }
    
    const totalRecipients = selectedMembers.length + customNumbersArray.length
    if (!confirm(`Send SMS to ${totalRecipients} recipient(s)?`)) {
      return
    }
    
    sendMutation.mutate({ 
      memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
      customNumbers: customNumbersArray.length > 0 ? customNumbersArray : undefined,
      message, 
      senderId: senderId || null,
      includeContributionStatus,
      includeStatementLink,
    })
  }

  const insertPlaceholder = (placeholder) => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = message
      const before = text.substring(0, start)
      const after = text.substring(end)
      setMessage(before + placeholder + after)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
      }, 0)
    } else {
      setMessage(message + placeholder)
    }
  }

  const selectedCount = selectedMembers.length
  const selectableCount = members.filter((m) => m.is_active && m.phone).length
  const customNumbersArray = customNumbers.split(/[,\n]/).map(n => n.trim()).filter(n => n.length > 0)
  const totalRecipients = selectedCount + customNumbersArray.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk SMS"
        description="Send SMS messages to members with dynamic placeholders"
        metric={statsData?.total || 0}
        metricLabel="Total Messages"
        gradient="from-purple-600 to-pink-600"
      />

      <div className="bg-white rounded-xl shadow-sm">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('compose')}
            className={`${
              activeTab === 'compose'
                ? 'border-purple-500 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } flex-1 py-4 px-6 border-b-2 font-medium text-sm transition-all rounded-tl-xl`}
          >
            ✍️ Compose Message
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`${
              activeTab === 'logs'
                ? 'border-purple-500 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } flex-1 py-4 px-6 border-b-2 font-medium text-sm transition-all rounded-tr-xl relative`}
          >
            📋 SMS Logs
            {statsData && (
              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                {statsData.total || 0}
              </span>
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'compose' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <span className="text-2xl">✍️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Compose Message</h2>
                <p className="text-sm text-gray-500">Create and send SMS to your members</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    Click placeholders to insert
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{name}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Member name"
                  >
                    {'{name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{phone}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Phone number"
                  >
                    {'{phone}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{member_code}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Member code"
                  >
                    {'{member_code}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{total_contributions}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Total contributions"
                  >
                    {'{total_contributions}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{total_invoices}')}
                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded border border-orange-300"
                    title="Total invoices issued"
                  >
                    {'{total_invoices}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{contribution_status}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Contribution status"
                  >
                    {'{contribution_status}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{contribution_difference}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Contribution difference"
                  >
                    {'{contribution_difference}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{statement_link}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Statement link (requires 'Include Statement Link' checked)"
                  >
                    {'{statement_link}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{pending_invoices}')}
                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded border border-orange-300"
                    title="Total pending invoices amount"
                  >
                    {'{pending_invoices}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{overdue_invoices}')}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded border border-red-300"
                    title="Total overdue invoices amount"
                  >
                    {'{overdue_invoices}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{pending_invoice_count}')}
                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded border border-orange-300"
                    title="Number of pending invoices"
                  >
                    {'{pending_invoice_count}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{oldest_invoice_number}')}
                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded border border-orange-300"
                    title="Oldest pending invoice number"
                  >
                    {'{oldest_invoice_number}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{oldest_invoice_due_date}')}
                    className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 rounded border border-orange-300"
                    title="Oldest invoice due date"
                  >
                    {'{oldest_invoice_due_date}'}
                  </button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={1000}
                  placeholder="Enter your message here. Use placeholders like {name}, {total_contributions}, etc."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {message.length} / 1000 characters
                  </span>
                  {message.includes('{statement_link}') && !includeStatementLink && (
                    <span className="text-amber-600 text-xs">
                      ⚠️ Enable "Include Statement Link" for {'{statement_link}'} to work
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeContributionStatus}
                      onChange={(e) => setIncludeContributionStatus(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Include Contribution Status
                    </span>
                  </label>
                  <p className="ml-6 text-xs text-gray-500 mt-1">
                    Automatically add contribution details to message
                  </p>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeStatementLink}
                      onChange={(e) => setIncludeStatementLink(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Include Statement Link
                    </span>
                  </label>
                  <p className="ml-6 text-xs text-gray-500 mt-1">
                    Add link to member's statement (use {'{statement_link}'} placeholder)
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sender ID (Optional)
                </label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  maxLength={11}
                  placeholder="EVIMERIA"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="mt-1 text-xs text-gray-500">
                  Leave empty to use default sender ID
                </div>
              </div>
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomNumbers(!showCustomNumbers)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 mb-3"
                >
                  {showCustomNumbers ? '−' : '+'} Add Custom Phone Numbers
                </button>
                {showCustomNumbers && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Phone Numbers
                    </label>
                    <textarea
                      value={customNumbers}
                      onChange={(e) => setCustomNumbers(e.target.value)}
                      rows={3}
                      placeholder="Enter phone numbers separated by commas or new lines (e.g., 254712345678, 254798765432)"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      Format: 254XXXXXXXXX or 0XXXXXXXXX (one per line or comma-separated)
                    </div>
                    {customNumbersArray.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {customNumbersArray.length} custom number(s) added
                      </div>
                    )}
                  </div>
                )}
              </div>
              {(selectedCount > 0 || customNumbersArray.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} selected
                      {selectedCount > 0 && ` (${selectedCount} member${selectedCount !== 1 ? 's' : ''})`}
                      {customNumbersArray.length > 0 && ` (${customNumbersArray.length} custom)`}
                    </span>
                    <div className="flex gap-2">
                      {selectedCount > 0 && (
                        <button
                          onClick={() => setSelectedMembers([])}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear members
                        </button>
                      )}
                      {customNumbersArray.length > 0 && (
                        <button
                          onClick={() => setCustomNumbers('')}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear custom
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || totalRecipients === 0 || !message.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendMutation.isPending ? 'Sending...' : `Send to ${totalRecipients} Recipient(s)`}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">👥 Select Recipients</h2>
                <p className="text-indigo-100 text-sm mt-1">Choose members to send SMS</p>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  placeholder="🔍 Search members..."
                  className="bg-white rounded-lg border-white shadow-md focus:border-purple-300 focus:ring-purple-300 text-sm px-4 py-2"
                />
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-semibold text-sm shadow-md transition-colors"
                >
                  {selectableCount > 0 && selectableCount === selectedMembers.filter(id => members.some(m => m.id === id)).length
                    ? '✗ Deselect All'
                    : '✓ Select All'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={selectableCount > 0 && selectableCount === selectedMembers.filter(id => members.some(m => m.id === id)).length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Phone</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Email</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {membersLoading ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                        Loading members...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => {
                      const isSelectable = member.is_active && member.phone
                      const isSelected = selectedMembers.includes(member.id)
                      return (
                        <tr
                          key={member.id}
                          className={`hover:bg-gray-50 ${!isSelectable ? 'opacity-50' : ''}`}
                        >
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMemberSelection(member.id)}
                              disabled={!isSelectable}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-900">
                            <div className="font-medium">{member.name}</div>
                            {!member.phone && (
                              <div className="text-xs text-red-500">No phone number</div>
                            )}
                            {!member.is_active && (
                              <div className="text-xs text-gray-500">Inactive</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                            {member.phone || '-'}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 hidden lg:table-cell">
                            {member.email || '-'}
                          </td>
                          <td className="px-2 py-2 hidden lg:table-cell">
                            <span
                              className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                member.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {pagination && pagination.last_page > 1 && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <Pagination
                  pagination={{
                    current_page: pagination.current_page || page,
                    last_page: pagination.last_page || 1,
                    per_page: pagination.per_page || 50,
                    total: pagination.total || 0,
                  }}
                  onPageChange={(newPage) => setPage(newPage)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-6">
          {statsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100 uppercase tracking-wide">Total Sent</p>
                    <p className="mt-3 text-4xl font-bold">{statsData.total || 0}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <HiEnvelope className="w-8 h-8" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100 uppercase tracking-wide">Successful</p>
                    <p className="mt-3 text-4xl font-bold">{statsData.sent || 0}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <HiCheckCircle className="w-8 h-8" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-100 uppercase tracking-wide">Failed</p>
                    <p className="mt-3 text-4xl font-bold">{statsData.failed || 0}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <HiXCircle className="w-8 h-8" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-100 uppercase tracking-wide">This Month</p>
                    <p className="mt-3 text-4xl font-bold">{statsData.this_month || 0}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <HiCalendar className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white">📨 SMS History</h2>
              <p className="text-purple-100 text-sm mt-1">Click on any message to view full content</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Sent By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                          <p className="text-gray-500">Loading SMS logs...</p>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="text-6xl mb-4">📭</div>
                          <p className="text-lg font-medium text-gray-900">No SMS logs found</p>
                          <p className="text-sm text-gray-500 mt-2">Send your first message to see it here</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {new Date(log.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-semibold text-gray-900">
                            {log.member?.name || <span className="text-gray-400 italic">No member</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                            {log.phone}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setExpandedMessageId(expandedMessageId === log.id ? null : log.id)}
                            className="text-left w-full hover:bg-purple-50 p-2 rounded-lg transition-colors"
                          >
                            <div className={`text-gray-900 ${expandedMessageId === log.id ? '' : 'line-clamp-2'}`}>
                              {log.message}
                            </div>
                            {log.message.length > 100 && (
                              <span className="text-xs text-purple-600 font-medium mt-1 inline-block">
                                {expandedMessageId === log.id ? '▼ Show less' : '▶ Show more'}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                              log.status === 'sent'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            }`}
                          >
                            {log.status === 'sent' && '✓'}
                            {log.status === 'failed' && '✗'}
                            {log.status === 'pending' && '⏳'}
                            <span className="ml-1">{log.status.toUpperCase()}</span>
                          </span>
                          {log.error && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                              {log.error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold text-xs mr-2">
                              {log.sent_by?.name?.charAt(0) || '?'}
                            </div>
                            <span>{log.sent_by?.name || '-'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {logsPagination && logsPagination.last_page > 1 && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <Pagination
                  pagination={{
                    current_page: logsPagination.current_page || logsPage,
                    last_page: logsPagination.last_page || 1,
                    per_page: logsPagination.per_page || 25,
                    total: logsPagination.total || 0,
                  }}
                  onPageChange={(newPage) => setLogsPage(newPage)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

