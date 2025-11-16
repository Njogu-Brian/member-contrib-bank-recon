import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getManualContributions, createManualContribution, updateManualContribution, deleteManualContribution, importExcel } from '../api/manualContributions'
import { getMembers } from '../api/members'
import Pagination from '../components/Pagination'

export default function ManualContributions() {
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const [editingContribution, setEditingContribution] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    contribution_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: '',
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['manual-contributions', page],
    queryFn: () => getManualContributions({ page }),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })

  const createMutation = useMutation({
    mutationFn: createManualContribution,
    onSuccess: () => {
      queryClient.invalidateQueries(['manual-contributions'])
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateManualContribution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['manual-contributions'])
      setShowModal(false)
      setEditingContribution(null)
      resetForm()
    },
  })

  const importMutation = useMutation({
    mutationFn: importExcel,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['manual-contributions'])
      alert(data.message || `Imported ${data.success} contributions`)
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Import failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteManualContribution,
    onSuccess: () => {
      queryClient.invalidateQueries(['manual-contributions'])
    },
  })

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: '',
      contribution_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: '',
    })
  }

  const handleEdit = (contribution) => {
    setEditingContribution(contribution)
    setFormData({
      member_id: contribution.member_id,
      amount: contribution.amount,
      contribution_date: contribution.contribution_date,
      payment_method: contribution.payment_method,
      notes: contribution.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingContribution) {
      updateMutation.mutate({ id: editingContribution.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Manual Contributions</h1>
        <button
          onClick={() => {
            setEditingContribution(null)
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add Contribution
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data?.map((contribution) => (
              <tr key={contribution.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contribution.contribution_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contribution.member?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(contribution.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{contribution.payment_method}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(contribution)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this contribution?')) {
                        deleteMutation.mutate(contribution.id)
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
                  {editingContribution ? 'Edit Contribution' : 'Add Contribution'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member *</label>
                    <select
                      required
                      value={formData.member_id}
                      onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select a member...</option>
                      {membersData?.data?.map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
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
                      value={formData.contribution_date}
                      onChange={(e) => setFormData({ ...formData, contribution_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                    <select
                      required
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
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
                      setEditingContribution(null)
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

