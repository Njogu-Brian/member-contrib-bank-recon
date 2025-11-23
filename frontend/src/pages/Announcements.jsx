import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../api/announcements'

export default function Announcements() {
  const [form, setForm] = useState({ title: '', body: '' })
  const queryClient = useQueryClient()

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
  })

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements'])
      setForm({ title: '', body: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => queryClient.invalidateQueries(['announcements']),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600">Publish updates to members and treasurers.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            rows={4}
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {createMutation.isLoading ? 'Publishing…' : 'Publish Announcement'}
          </button>
        </div>
      </form>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent announcements</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : announcements.length ? (
          <div className="divide-y">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-6 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{announcement.title}</h3>
                    <p className="text-sm text-gray-500">{announcement.published_at || 'Draft'}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(announcement.id)}
                    className="text-sm text-rose-600"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-gray-700 whitespace-pre-line">{announcement.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-gray-500">No announcements yet.</div>
        )}
      </div>
    </div>
  )
}

