import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBudgets, createBudget } from '../api/budgets'

export default function Budgets() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), total_amount: '' })

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: getBudgets,
  })

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets'])
      setForm({ name: '', year: new Date().getFullYear(), total_amount: '' })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      total_amount: Number(form.total_amount),
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Plan monthly targets and monitor actuals.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Year</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Total amount (KES)</label>
          <input
            type="number"
            step="0.01"
            value={form.total_amount}
            onChange={(e) => setForm((prev) => ({ ...prev, total_amount: e.target.value }))}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
          >
            {createMutation.isLoading ? 'Saving…' : 'Create Budget'}
          </button>
        </div>
      </form>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Current budgets</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : budgets.length ? (
          <div className="divide-y">
            {budgets.map((budget) => (
              <div key={budget.id} className="p-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{budget.name}</h3>
                    <p className="text-sm text-gray-500">{budget.year}</p>
                  </div>
                  <p className="text-lg font-semibold">KES {Number(budget.total_amount).toLocaleString()}</p>
                </div>
                {budget.months?.length ? (
                  <div className="mt-4 grid md:grid-cols-3 gap-4">
                    {budget.months.map((month) => (
                      <div key={month.id} className="border rounded p-3">
                        <p className="text-sm text-gray-500">Month {month.month}</p>
                        <p className="text-sm">Planned: KES {Number(month.planned_amount).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Actual: KES {Number(month.actual_amount).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-3">No monthly breakdown yet.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-gray-500">No budgets configured.</div>
        )}
      </div>
    </div>
  )
}

