import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses'
import { getMembers } from '../api/members'
import Pagination from '../components/Pagination'

export default function Expenses() {
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
    assign_to_all_members: false,
    member_ids: [],
    amount_per_member: '',
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page],
    queryFn: () => getExpenses({ page }),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', 'for-expenses'],
    queryFn: () => getMembers({ per_page: 1000 }),
  })

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses'])
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses'])
      setShowModal(false)
      setEditingExpense(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses'])
    },
  })

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      notes: '',
      assign_to_all_members: false,
      member_ids: [],
      amount_per_member: '',
    })
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date,
      category: expense.category || '',
      notes: expense.notes || '',
      assign_to_all_members: false,
      member_ids: [],
      amount_per_member: '',
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      description: formData.description,
      amount: formData.amount,
      expense_date: formData.expense_date,
      category: formData.category || undefined,
      notes: formData.notes || undefined,
      assign_to_all_members: formData.assign_to_all_members,
      amount_per_member: formData.amount_per_member ? parseFloat(formData.amount_per_member) : undefined,
      member_ids: formData.assign_to_all_members ? undefined : formData.member_ids,
    }

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <button
          onClick={() => {
            setEditingExpense(null)
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add Expense
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data?.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.expense_date}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(expense.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(expense)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this expense?')) {
                        deleteMutation.mutate(expense.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && (
          <Pagination
            pagination={{
              current_page: data.current_page || 1,
              last_page: data.last_page || 1,
              per_page: data.per_page || 20,
              total: data.total || 0,
            }}
            onPageChange={(newPage) => setPage(newPage)}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingExpense ? 'Edit Expense' : 'Add Expense'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description *</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.assign_to_all_members}
                      onChange={(e) => setFormData({
                        ...formData,
                        assign_to_all_members: e.target.checked,
                        member_ids: e.target.checked ? [] : formData.member_ids,
                      })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                    />
                    Assign to all active members
                  </label>
                  {!formData.assign_to_all_members && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">Assign to specific members</label>
                      <select
                        multiple
                        value={formData.member_ids.map(String)}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions).map((option) => Number(option.value))
                          setFormData({ ...formData, member_ids: selected })
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-32"
                      >
                        {membersData?.data?.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} {member.phone ? `(${member.phone})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd while clicking to select multiple members.</p>
                    </div>
                  )}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">Amount per member (optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount_per_member}
                      onChange={(e) => setFormData({ ...formData, amount_per_member: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to divide the total amount equally among selected members.
                    </p>
                  </div>
                </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingExpense(null)
                      resetForm()
                    }}
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

