import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, markInvoiceAsPaid, cancelInvoice, bulkMatchInvoices } from '../api/invoices'
import { getMembers } from '../api/members'
import MemberSearchModal from '../components/MemberSearchModal'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'

export default function Invoices() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    member_id: '',
    overdue_only: false,
  })
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [showMemberSearch, setShowMemberSearch] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '1000',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    description: '',
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, filters],
    queryFn: () => getInvoices({ page, ...filters }),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', 'filter'],
    queryFn: () => getMembers({ per_page: 1000 }),
  })

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      setShowModal(false)
      resetForm()
      alert('Invoice created successfully!')
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to create invoice'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      setShowModal(false)
      setEditingInvoice(null)
      resetForm()
      alert('Invoice updated successfully!')
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to update invoice'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      alert('Invoice deleted successfully!')
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to delete invoice'),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, paymentId }) => markInvoiceAsPaid(id, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      alert('Invoice marked as paid!')
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to mark invoice as paid'),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      alert('Invoice cancelled successfully!')
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to cancel invoice'),
  })

  const bulkMatchMutation = useMutation({
    mutationFn: bulkMatchInvoices,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['invoices'])
      const result = data.result || {}
      alert(`Matched ${result.total_invoices_paid || 0} invoices to payments!`)
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to match invoices'),
  })

  const handleBulkMatch = () => {
    if (confirm('This will automatically match all contributions to pending invoices. Continue?')) {
      bulkMatchMutation.mutate()
    }
  }

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: '1000',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
      description: '',
    })
    setSelectedMember(null)
  }

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice)
    setFormData({
      member_id: invoice.member_id,
      amount: invoice.amount,
      due_date: invoice.due_date,
      issue_date: invoice.issue_date,
      description: invoice.description || '',
    })
    setSelectedMember(invoice.member)
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.member_id) {
      alert('Please select a member')
      return
    }
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (invoice) => {
    if (confirm(`Delete invoice ${invoice.invoice_number}?`)) {
      deleteMutation.mutate(invoice.id)
    }
  }

  const handleCancel = (invoice) => {
    if (confirm(`Cancel invoice ${invoice.invoice_number}?`)) {
      cancelMutation.mutate(invoice.id)
    }
  }

  const handleMemberSelect = (member) => {
    setSelectedMember(member)
    setFormData({ ...formData, member_id: member.id })
    setShowMemberSearch(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const invoices = data?.data || []
  const pagination = data?.meta || data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage weekly contribution invoices and track payments"
        metric={pagination?.total || 0}
        metricLabel="Total Invoices"
        gradient="from-orange-600 to-amber-600"
      />

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleBulkMatch}
            disabled={bulkMatchMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
          >
            {bulkMatchMutation.isPending ? 'Matching...' : '💰 Auto-Match Payments'}
          </button>
          <button
            onClick={() => {
              setEditingInvoice(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 transition-all"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Member</label>
            <select
              value={filters.member_id}
              onChange={(e) => {
                setFilters({ ...filters, member_id: e.target.value })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Members</option>
              {membersData?.data?.slice(0, 50).map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.overdue_only}
                onChange={(e) => {
                  setFilters({ ...filters, overdue_only: e.target.checked })
                  setPage(1)
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Overdue Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-sm text-gray-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.member?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(invoice.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.issue_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.period || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {invoice.status === 'pending' && (
                      <>
                        <button onClick={() => handleEdit(invoice)} className="text-indigo-600 hover:text-indigo-900">
                          Edit
                        </button>
                        <button onClick={() => handleCancel(invoice)} className="text-orange-600 hover:text-orange-900">
                          Cancel
                        </button>
                      </>
                    )}
                    {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                      <button onClick={() => handleDelete(invoice)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pagination && (
          <Pagination
            pagination={{
              current_page: pagination.current_page || 1,
              last_page: pagination.last_page || 1,
              per_page: pagination.per_page || 25,
              total: pagination.total || 0,
            }}
            onPageChange={(newPage) => setPage(newPage)}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member *</label>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setShowMemberSearch(true)}
                        disabled={!!editingInvoice}
                        className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    <label className="block text-sm font-medium text-gray-700">Issue Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                      setEditingInvoice(null)
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

