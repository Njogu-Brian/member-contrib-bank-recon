import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers } from '../api/members'
import { sendBulkSms, getSmsLogs, getSmsStatistics } from '../api/sms'
import Pagination from '../components/Pagination'

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Bulk SMS</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('compose')}
            className={`${
              activeTab === 'compose'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Compose
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            SMS Logs
            {statsData && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {statsData.total || 0}
              </span>
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'compose' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Compose Message</h2>
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
                    onClick={() => insertPlaceholder('{expected_contributions}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Expected contributions"
                  >
                    {'{expected_contributions}'}
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

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Select Members</h2>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search members..."
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    {selectableCount > 0 && selectableCount === selectedMembers.filter(id => members.some(m => m.id === id)).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-xs font-medium uppercase text-gray-500">Total Sent</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{statsData.total || 0}</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-xs font-medium uppercase text-gray-500">Successful</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">{statsData.sent || 0}</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-xs font-medium uppercase text-gray-500">Failed</p>
                <p className="mt-2 text-2xl font-semibold text-red-600">{statsData.failed || 0}</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-xs font-medium uppercase text-gray-500">This Month</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{statsData.this_month || 0}</p>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">SMS History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Phone</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Sent By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                        No SMS logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900">
                          {log.member?.name || '-'}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                          {log.phone}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={log.message}>
                            {log.message}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                              log.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.error && (
                            <div className="mt-1 text-xs text-red-500 truncate max-w-xs" title={log.error}>
                              {log.error}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500 hidden lg:table-cell">
                          {log.sent_by?.name || '-'}
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

