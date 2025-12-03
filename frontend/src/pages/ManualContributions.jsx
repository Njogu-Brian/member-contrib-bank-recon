import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getManualContributions, createManualContribution, updateManualContribution, deleteManualContribution, importExcel } from '../api/manualContributions'
import Pagination from '../components/Pagination'
import MemberSearchModal from '../components/MemberSearchModal'
import PageHeader from '../components/PageHeader'

export default function ManualContributions() {
  const [showModal, setShowModal] = useState(false)
  const [showMemberSearch, setShowMemberSearch] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
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
    setSelectedMember(null)
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
    setSelectedMember(contribution.member)
    setShowModal(true)
  }

  const handleMemberSelect = (member) => {
    setSelectedMember(member)
    setFormData({ ...formData, member_id: member.id })
    setShowMemberSearch(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.member_id) {
      alert('Please select a member')
      return
    }
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
      <PageHeader
        title="Manual Contributions"
        description="Record cash and offline contributions manually"
        metric={data?.total || 0}
        metricLabel="Total Records"
        gradient="from-purple-600 to-pink-600"
      />

      <div className="bg-white rounded-xl shadow-sm p-4 flex justify-end">
        <button
          onClick={() => {
            setEditingContribution(null)
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          + Add Contribution
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setShowMemberSearch(true)}
                        className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                      >
                        <span className={selectedMember ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedMember ? selectedMember.name : 'Click to search and select a member...'}
                        </span>
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {selectedMember && (
                        <p className="mt-1 text-xs text-gray-500">
                          {[selectedMember.phone, selectedMember.email, selectedMember.member_code].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <input type="hidden" required value={formData.member_id} />
                    </div>
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

      <MemberSearchModal
        isOpen={showMemberSearch}
        onClose={() => setShowMemberSearch(false)}
        onSelect={handleMemberSelect}
        title="Select Member"
        preSelectedId={formData.member_id}
      />
    </div>
  )
}

