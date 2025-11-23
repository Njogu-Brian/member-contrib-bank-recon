import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvestments, createInvestment } from '../api/investments'

const emptyForm = {
  member_id: '',
  name: '',
  principal_amount: '',
  expected_roi_rate: '12',
  start_date: '',
  end_date: '',
  description: '',
}

export default function Investments() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: getInvestments,
  })

  const createMutation = useMutation({
    mutationFn: createInvestment,
    onSuccess: () => {
      queryClient.invalidateQueries(['investments'])
      setForm(emptyForm)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      member_id: Number(form.member_id),
      principal_amount: Number(form.principal_amount),
      expected_roi_rate: Number(form.expected_roi_rate),
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investments</h1>
          <p className="text-gray-600">Track member investments and projected ROI.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Member ID</label>
          <input
            required
            value={form.member_id}
            onChange={(e) => setForm((prev) => ({ ...prev, member_id: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Principal (KES)</label>
          <input
            required
            type="number"
            step="0.01"
            value={form.principal_amount}
            onChange={(e) => setForm((prev) => ({ ...prev, principal_amount: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ROI %</label>
          <input
            required
            type="number"
            step="0.01"
            value={form.expected_roi_rate}
            onChange={(e) => setForm((prev) => ({ ...prev, expected_roi_rate: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            required
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {createMutation.isLoading ? 'Saving…' : 'Create Investment'}
          </button>
        </div>
      </form>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Active Investments</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : investments.length ? (
          <div className="divide-y">
            {investments.map((investment) => (
              <div key={investment.id} className="p-6 grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Member</p>
                  <p className="font-semibold">#{investment.member_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Principal</p>
                  <p className="font-semibold">KES {Number(investment.principal_amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ROI Rate</p>
                  <p className="font-semibold">{investment.expected_roi_rate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                    {investment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-gray-500">No investments yet.</div>
        )}
      </div>
    </div>
  )
}

