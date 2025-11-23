import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificationPrefs, updateNotificationPrefs, getNotificationLog } from '../api/notifications'

export default function Notifications() {
  const queryClient = useQueryClient()
  const [prefs, setPrefs] = useState({ email_enabled: true, sms_enabled: false, push_enabled: false })

  const { data: prefData } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: getNotificationPrefs,
  })

  const { data: log = [] } = useQuery({
    queryKey: ['notification-log'],
    queryFn: getNotificationLog,
  })

  useEffect(() => {
    if (prefData) {
      setPrefs(prefData)
    }
  }, [prefData])

  const updateMutation = useMutation({
    mutationFn: updateNotificationPrefs,
    onSuccess: () => queryClient.invalidateQueries(['notification-prefs']),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(prefs)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Control how Evimeria contacts you.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        {['email_enabled', 'sms_enabled', 'push_enabled'].map((field) => (
          <label key={field} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={prefs[field]}
              onChange={(e) => setPrefs((prev) => ({ ...prev, [field]: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 capitalize">{field.replace('_', ' ')}</span>
          </label>
        ))}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {updateMutation.isLoading ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </form>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Log</h2>
        </div>
        {log.length ? (
          <ul className="divide-y">
            {log.map((entry) => (
              <li key={entry.id} className="p-4 flex justify-between">
                <div>
                  <p className="font-medium">{entry.type}</p>
                  <p className="text-sm text-gray-600">{entry.channel}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{entry.sent_at || 'pending'}</p>
                  <span className="text-xs uppercase text-gray-500">{entry.status}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-gray-500">No notifications sent yet.</div>
        )}
      </div>
    </div>
  )
}

