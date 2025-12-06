import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers } from '../api/members'
import { sendBulkEmail, getEmailLogs, getEmailStatistics } from '../api/emails'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import { HiEnvelope, HiCheckCircle, HiXCircle, HiCalendar } from 'react-icons/hi2'

export default function BulkEmail() {
  const [selectedMembers, setSelectedMembers] = useState([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [logsSearchTerm, setLogsSearchTerm] = useState('')
  const [logsStatusFilter, setLogsStatusFilter] = useState('')
  const [activeTab, setActiveTab] = useState('compose')
  const [includeContributionStatus, setIncludeContributionStatus] = useState(false)
  const [includeStatementLink, setIncludeStatementLink] = useState(false)
  const [customEmails, setCustomEmails] = useState('')
  const [showCustomEmails, setShowCustomEmails] = useState(false)
  const [expandedMessageId, setExpandedMessageId] = useState(null)

  const queryClient = useQueryClient()

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'email', searchTerm, page],
    queryFn: () => getMembers({ search: searchTerm, per_page: 50, page }),
  })

  // Query to fetch all members for "Select All" functionality
  const { data: allMembersData } = useQuery({
    queryKey: ['members', 'email', 'all', searchTerm],
    queryFn: () => getMembers({ search: searchTerm, per_page: 10000, page: 1 }),
    enabled: false, // Only fetch when needed
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs', logsPage, logsSearchTerm, logsStatusFilter],
    queryFn: () => getEmailLogs({ 
      page: logsPage, 
      per_page: 25,
      search: logsSearchTerm || undefined,
      status: logsStatusFilter || undefined,
    }),
    enabled: activeTab === 'logs',
  })

  const { data: statsData } = useQuery({
    queryKey: ['email-statistics'],
    queryFn: () => getEmailStatistics(),
    enabled: activeTab === 'logs',
  })

  const sendMutation = useMutation({
    mutationFn: ({ memberIds, customEmails, subject, message, includeContributionStatus, includeStatementLink }) => 
      sendBulkEmail(memberIds, subject, message, customEmails, includeContributionStatus, includeStatementLink),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['email-logs'])
      queryClient.invalidateQueries(['email-statistics'])
      setSelectedMembers([])
      setSubject('')
      setMessage('')
      setCustomEmails('')
      setIncludeContributionStatus(false)
      setIncludeStatementLink(false)
      alert(`Email sent successfully!\n\nSent: ${data.results?.success || 0}\nFailed: ${data.results?.failed || 0}\nTotal: ${data.results?.total || 0}`)
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to send email')
    },
  })

  const members = membersData?.data || []
  const pagination = membersData ? {
    current_page: membersData.current_page || page,
    last_page: membersData.last_page || 1,
    per_page: membersData.per_page || 50,
    total: membersData.total || 0,
  } : null
  const logs = logsData?.data || []
  const logsPagination = logsData ? {
    current_page: logsData.current_page || logsPage,
    last_page: logsData.last_page || 1,
    per_page: logsData.per_page || 25,
    total: logsData.total || 0,
  } : null

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const toggleSelectAll = async () => {
    // Fetch all members if not already fetched
    let allSelectableIds = []
    
    if (allMembersData?.data) {
      // Use cached data
      allSelectableIds = allMembersData.data
        .filter((m) => m.is_active && m.email)
        .map((m) => m.id)
    } else {
      // Fetch all members
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ['members', 'email', 'all', searchTerm],
          queryFn: () => getMembers({ search: searchTerm, per_page: 10000, page: 1 }),
        })
        const fetchedMembers = data?.data || []
        allSelectableIds = fetchedMembers
          .filter((m) => m.is_active && m.email)
          .map((m) => m.id)
      } catch (error) {
        console.error('Failed to fetch all members:', error)
        // Fallback to current page only
        allSelectableIds = members.filter((m) => m.is_active && m.email).map((m) => m.id)
      }
    }
    
    // Check if all are already selected
    const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedMembers.includes(id))
    
    if (allSelected) {
      // Deselect all
      setSelectedMembers([])
    } else {
      // Select all (merge with existing selections to keep selections from other pages)
      setSelectedMembers((prev) => {
        const newSelections = [...new Set([...prev, ...allSelectableIds])]
        return newSelections
      })
    }
  }

  const handleSend = () => {
    const customEmailsArray = customEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'))

    if (selectedMembers.length === 0 && customEmailsArray.length === 0) {
      alert('Please select at least one member or enter custom email addresses')
      return
    }
    if (!subject.trim()) {
      alert('Please enter a subject')
      return
    }
    if (!message.trim()) {
      alert('Please enter a message')
      return
    }
    
    const totalRecipients = selectedMembers.length + customEmailsArray.length
    if (!confirm(`Send email to ${totalRecipients} recipient(s)?`)) {
      return
    }
    
    sendMutation.mutate({ 
      memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
      customEmails: customEmailsArray.length > 0 ? customEmailsArray : undefined,
      subject,
      message, 
      includeContributionStatus,
      includeStatementLink,
    })
  }

  const insertPlaceholder = (placeholder, target = 'message') => {
    const textarea = document.querySelector(`textarea[name="${target}"]`) || 
                     (target === 'message' ? document.querySelector('textarea') : null)
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = target === 'subject' ? subject : message
      const before = text.substring(0, start)
      const after = text.substring(end)
      if (target === 'subject') {
        setSubject(before + placeholder + after)
      } else {
        setMessage(before + placeholder + after)
      }
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
      }, 0)
    } else {
      if (target === 'subject') {
        setSubject(subject + placeholder)
      } else {
        setMessage(message + placeholder)
      }
    }
  }

  const selectedCount = selectedMembers.length
  const customEmailsArray = customEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'))
  const totalRecipients = selectedCount + customEmailsArray.length
  
  // Check if all members across all pages are selected
  const allSelectableIds = (allMembersData?.data || members)
    .filter((m) => m.is_active && m.email)
    .map((m) => m.id)
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedMembers.includes(id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Email"
        description="Send email messages to members with dynamic placeholders"
        metric={statsData?.total || 0}
        metricLabel="Total Emails"
        gradient="from-blue-600 to-cyan-600"
      />

      <div className="bg-white rounded-xl shadow-sm">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('compose')}
            className={`${
              activeTab === 'compose'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } flex-1 py-4 px-6 border-b-2 font-medium text-sm transition-all rounded-tl-xl`}
          >
            ✍️ Compose Email
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } flex-1 py-4 px-6 border-b-2 font-medium text-sm transition-all rounded-tr-xl relative`}
          >
            📋 Email Logs
            {statsData && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                <span className="text-2xl">✉️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Compose Email</h2>
                <p className="text-sm text-gray-500">Create and send emails to your members</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    Click placeholders to insert
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{name}', 'subject')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Member name"
                  >
                    {'{name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{member_code}', 'subject')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Member code"
                  >
                    {'{member_code}'}
                  </button>
                </div>
                <input
                  type="text"
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={255}
                  placeholder="Enter email subject..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="mt-1 text-sm text-gray-500">
                  {subject.length} / 255 characters
                </div>
              </div>
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
                    onClick={() => insertPlaceholder('{email}')}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title="Email address"
                  >
                    {'{email}'}
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
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                  placeholder="Enter your message here. Use placeholders like {name}, {total_contributions}, etc."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {message.length} characters
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
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomEmails(!showCustomEmails)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 mb-3"
                >
                  {showCustomEmails ? '−' : '+'} Add Custom Email Addresses
                </button>
                {showCustomEmails && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Email Addresses
                    </label>
                    <textarea
                      value={customEmails}
                      onChange={(e) => setCustomEmails(e.target.value)}
                      rows={3}
                      placeholder="Enter email addresses separated by commas or new lines (e.g., user@example.com, admin@example.com)"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      Format: valid email addresses (one per line or comma-separated)
                    </div>
                    {customEmailsArray.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {customEmailsArray.length} custom email(s) added
                      </div>
                    )}
                  </div>
                )}
              </div>
              {(selectedCount > 0 || customEmailsArray.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} selected
                      {selectedCount > 0 && ` (${selectedCount} member${selectedCount !== 1 ? 's' : ''})`}
                      {customEmailsArray.length > 0 && ` (${customEmailsArray.length} custom)`}
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
                      {customEmailsArray.length > 0 && (
                        <button
                          onClick={() => setCustomEmails('')}
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
                  disabled={sendMutation.isPending || totalRecipients === 0 || !message.trim() || !subject.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendMutation.isPending ? 'Sending...' : `Send to ${totalRecipients} Recipient(s)`}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">👥 Select Recipients</h2>
                <p className="text-blue-100 text-sm mt-1">Choose members to send email</p>
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
                  className="bg-white rounded-lg border-white shadow-md focus:border-blue-300 focus:ring-blue-300 text-sm px-4 py-2"
                />
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm shadow-md transition-colors"
                >
                  {allSelected
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
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Email</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Phone</th>
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
                      const isSelectable = member.is_active && member.email
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
                            {!member.email && (
                              <div className="text-xs text-red-500">No email address</div>
                            )}
                            {!member.is_active && (
                              <div className="text-xs text-gray-500">Inactive</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 hidden md:table-cell">
                            {member.email || '-'}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 hidden lg:table-cell">
                            {member.phone || '-'}
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
            {pagination && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <Pagination
                  pagination={pagination}
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
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100 uppercase tracking-wide">This Month</p>
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
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white">📧 Email History</h2>
              <p className="text-blue-100 text-sm mt-1">Click on any message to view full content</p>
              <div className="flex items-center gap-3 mt-4">
                <input
                  type="text"
                  value={logsSearchTerm}
                  onChange={(e) => {
                    setLogsSearchTerm(e.target.value)
                    setLogsPage(1)
                  }}
                  placeholder="🔍 Search by member, email, subject, or sender..."
                  className="flex-1 bg-white rounded-lg border-white shadow-md focus:border-blue-300 focus:ring-blue-300 text-sm px-4 py-2"
                />
                <select
                  value={logsStatusFilter}
                  onChange={(e) => {
                    setLogsStatusFilter(e.target.value)
                    setLogsPage(1)
                  }}
                  className="bg-white rounded-lg border-white shadow-md focus:border-blue-300 focus:ring-blue-300 text-sm px-4 py-2"
                >
                  <option value="">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
                {(logsSearchTerm || logsStatusFilter) && (
                  <button
                    onClick={() => {
                      setLogsSearchTerm('')
                      setLogsStatusFilter('')
                      setLogsPage(1)
                    }}
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm shadow-md transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Sent By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-500">Loading email logs...</p>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="text-6xl mb-4">📭</div>
                          <p className="text-lg font-medium text-gray-900">No email logs found</p>
                          <p className="text-sm text-gray-500 mt-2">Send your first email to see it here</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-blue-50 transition-colors">
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
                            {log.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setExpandedMessageId(expandedMessageId === log.id ? null : log.id)}
                            className="text-left w-full hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              {log.subject}
                            </div>
                            <div className={`text-gray-600 text-xs ${expandedMessageId === log.id ? '' : 'line-clamp-2'}`}>
                              {log.message}
                            </div>
                            {log.message.length > 100 && (
                              <span className="text-xs text-blue-600 font-medium mt-1 inline-block">
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
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs mr-2">
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
            {logsPagination && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <Pagination
                  pagination={logsPagination}
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

