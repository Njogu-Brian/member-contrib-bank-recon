import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificationPrefs, updateNotificationPrefs, getNotificationLog, sendWhatsApp, sendMonthlyStatements, sendContributionReminders } from '../api/notifications'
import { getMembers } from '../api/members'
import { HiOutlineChatBubbleLeftRight, HiOutlineDocumentText, HiOutlineBellAlert, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock } from 'react-icons/hi2'

export default function Notifications() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('preferences')
  const [prefs, setPrefs] = useState({ email_enabled: true, sms_enabled: false, push_enabled: false, whatsapp_enabled: false })
  
  // WhatsApp send form state
  const [whatsappForm, setWhatsappForm] = useState({
    phone: '',
    message: '',
    member_id: null,
  })

  // Monthly statements form state
  const [statementsForm, setStatementsForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    channel: 'whatsapp',
    member_ids: [],
  })

  // Reminders form state
  const [remindersForm, setRemindersForm] = useState({
    channel: 'whatsapp',
    member_ids: [],
  })

  const { data: prefData } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: getNotificationPrefs,
  })

  const { data: log = [] } = useQuery({
    queryKey: ['notification-log'],
    queryFn: getNotificationLog,
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', 'for-notifications'],
    queryFn: () => getMembers({ per_page: 1000 }),
  })

  const members = membersData?.data || []

  useEffect(() => {
    if (prefData) {
      setPrefs(prefData)
    }
  }, [prefData])

  const updateMutation = useMutation({
    mutationFn: updateNotificationPrefs,
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-prefs'])
      alert('Preferences updated successfully')
    },
  })

  const sendWhatsAppMutation = useMutation({
    mutationFn: sendWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-log'])
      setWhatsappForm({ phone: '', message: '', member_id: null })
      alert('WhatsApp message sent successfully')
    },
    onError: (error) => {
      alert('Failed to send WhatsApp message: ' + (error.response?.data?.message || error.message))
    },
  })

  const sendStatementsMutation = useMutation({
    mutationFn: sendMonthlyStatements,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notification-log'])
      alert(`Monthly statements queued: ${data.sent} sent, ${data.failed} failed`)
    },
    onError: (error) => {
      alert('Failed to send monthly statements: ' + (error.response?.data?.message || error.message))
    },
  })

  const sendRemindersMutation = useMutation({
    mutationFn: sendContributionReminders,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['notification-log'])
      alert(`Contribution reminders queued: ${data.sent} sent, ${data.failed} failed`)
    },
    onError: (error) => {
      alert('Failed to send contribution reminders: ' + (error.response?.data?.message || error.message))
    },
  })

  const handlePrefsSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(prefs)
  }

  const handleWhatsAppSubmit = (e) => {
    e.preventDefault()
    sendWhatsAppMutation.mutate(whatsappForm)
  }

  const handleStatementsSubmit = (e) => {
    e.preventDefault()
    sendStatementsMutation.mutate(statementsForm)
  }

  const handleRemindersSubmit = (e) => {
    e.preventDefault()
    sendRemindersMutation.mutate(remindersForm)
  }

  const getStatusBadge = (status) => {
    const badges = {
      sent: { icon: HiOutlineCheckCircle, color: 'bg-green-100 text-green-800', label: 'Sent' },
      pending: { icon: HiOutlineClock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      failed: { icon: HiOutlineXCircle, color: 'bg-red-100 text-red-800', label: 'Failed' },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Manage notifications and communication settings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'preferences', label: 'Preferences', icon: HiOutlineBellAlert },
            { id: 'whatsapp', label: 'WhatsApp', icon: HiOutlineChatBubbleLeftRight },
            { id: 'statements', label: 'Monthly Statements', icon: HiOutlineDocumentText },
            { id: 'reminders', label: 'Contribution Reminders', icon: HiOutlineBellAlert },
            { id: 'log', label: 'Activity Log', icon: HiOutlineDocumentText },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form onSubmit={handlePrefsSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          {[
            { key: 'email_enabled', label: 'Email Notifications' },
            { key: 'sms_enabled', label: 'SMS Notifications' },
            { key: 'whatsapp_enabled', label: 'WhatsApp Notifications' },
            { key: 'push_enabled', label: 'Push Notifications' },
          ].map((field) => (
            <label key={field.key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={prefs[field.key] || false}
                onChange={(e) => setPrefs((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                className="h-4 w-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">{field.label}</span>
            </label>
          ))}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-md shadow hover:bg-brand-700 disabled:opacity-50"
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
        <form onSubmit={handleWhatsAppSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Send WhatsApp Message</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Member (Optional)
            </label>
            <select
              value={whatsappForm.member_id || ''}
              onChange={(e) => {
                const memberId = e.target.value ? parseInt(e.target.value) : null
                const member = members.find((m) => m.id === memberId)
                setWhatsappForm({
                  ...whatsappForm,
                  member_id: memberId,
                  phone: member?.phone || '',
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select a member (or enter phone manually)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.phone || 'No phone'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={whatsappForm.phone}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, phone: e.target.value })}
              placeholder="254712345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={whatsappForm.message}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, message: e.target.value })}
              rows={6}
              maxLength={1000}
              placeholder="Enter your message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">{whatsappForm.message.length}/1000 characters</p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-50"
              disabled={sendWhatsAppMutation.isLoading}
            >
              {sendWhatsAppMutation.isLoading ? 'Sending…' : 'Send WhatsApp Message'}
            </button>
          </div>
        </form>
      )}

      {/* Monthly Statements Tab */}
      {activeTab === 'statements' && (
        <form onSubmit={handleStatementsSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Send Monthly Statements</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <input
              type="month"
              value={statementsForm.month}
              onChange={(e) => setStatementsForm({ ...statementsForm, month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel
            </label>
            <select
              value={statementsForm.channel}
              onChange={(e) => setStatementsForm({ ...statementsForm, channel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-md shadow hover:bg-brand-700 disabled:opacity-50"
              disabled={sendStatementsMutation.isLoading}
            >
              {sendStatementsMutation.isLoading ? 'Sending…' : 'Send Monthly Statements'}
            </button>
          </div>
        </form>
      )}

      {/* Contribution Reminders Tab */}
      {activeTab === 'reminders' && (
        <form onSubmit={handleRemindersSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Send Contribution Reminders</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel
            </label>
            <select
              value={remindersForm.channel}
              onChange={(e) => setRemindersForm({ ...remindersForm, channel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-md shadow hover:bg-brand-700 disabled:opacity-50"
              disabled={sendRemindersMutation.isLoading}
            >
              {sendRemindersMutation.isLoading ? 'Sending…' : 'Send Contribution Reminders'}
            </button>
          </div>
        </form>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'log' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Activity Log</h2>
          </div>
          {log.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {log.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.channel || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.phone || entry.recipient || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(entry.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.sent_at ? new Date(entry.sent_at).toLocaleString() : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-gray-500 text-center">No notifications sent yet.</div>
          )}
        </div>
      )}
    </div>
  )
}

