import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMeetings, createMeeting, proposeMotion, castVote } from '../api/meetings'

const initialForm = { title: '', scheduled_for: '', location: '', agenda_summary: '' }

export default function Meetings() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initialForm)
  const [motionForm, setMotionForm] = useState({ meeting_id: '', title: '', description: '' })

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMeetings,
  })

  const createMeetingMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries(['meetings'])
      setForm(initialForm)
    },
  })

  const proposeMotionMutation = useMutation({
    mutationFn: ({ meeting_id, payload }) => proposeMotion({ meetingId: meeting_id, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries(['meetings'])
      setMotionForm({ meeting_id: '', title: '', description: '' })
    },
  })

  const voteMutation = useMutation({
    mutationFn: ({ motionId, choice }) => castVote({ motionId, payload: { choice } }),
    onSuccess: () => queryClient.invalidateQueries(['meetings']),
  })

  const handleMeetingSubmit = (e) => {
    e.preventDefault()
    createMeetingMutation.mutate(form)
  }

  const handleMotionSubmit = (e) => {
    e.preventDefault()
    if (!motionForm.meeting_id) return
    proposeMotionMutation.mutate({
      meeting_id: Number(motionForm.meeting_id),
      payload: motionForm,
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings & Voting</h1>
          <p className="text-gray-600">Schedule agendas, collect motions, and capture votes.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleMeetingSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Schedule meeting</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date & time</label>
            <input
              type="datetime-local"
              required
              value={form.scheduled_for}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduled_for: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location / link</label>
            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Agenda summary</label>
            <textarea
              rows={3}
              value={form.agenda_summary}
              onChange={(e) => setForm((prev) => ({ ...prev, agenda_summary: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {createMeetingMutation.isLoading ? 'Scheduling…' : 'Schedule Meeting'}
          </button>
        </form>

        <form onSubmit={handleMotionSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Propose motion</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Meeting</label>
            <select
              required
              value={motionForm.meeting_id}
              onChange={(e) => setMotionForm((prev) => ({ ...prev, meeting_id: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select meeting</option>
              {meetings.map((meeting) => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title} – {meeting.scheduled_for}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              required
              value={motionForm.title}
              onChange={(e) => setMotionForm((prev) => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              required
              value={motionForm.description}
              onChange={(e) => setMotionForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {proposeMotionMutation.isLoading ? 'Submitting…' : 'Submit Motion'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Upcoming meetings</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : (
          <div className="divide-y">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="p-6 space-y-3">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{meeting.title}</h3>
                    <p className="text-sm text-gray-500">{meeting.scheduled_for}</p>
                  </div>
                  <span className="text-sm text-gray-600">{meeting.status}</span>
                </div>
                <p className="text-gray-700">{meeting.agenda_summary}</p>
                {meeting.motions?.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Motions</p>
                    {meeting.motions.map((motion) => (
                      <div key={motion.id} className="border rounded p-3">
                        <div className="flex justify-between">
                          <p className="font-medium">{motion.title}</p>
                          <span className="text-xs uppercase text-gray-500">{motion.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{motion.description}</p>
                        <div className="flex gap-2">
                          {['yes', 'no', 'abstain'].map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => voteMutation.mutate({ motionId: motion.id, choice })}
                              className="px-3 py-1 text-sm border rounded text-gray-700 hover:bg-gray-100"
                            >
                              Vote {choice}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No motions yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

