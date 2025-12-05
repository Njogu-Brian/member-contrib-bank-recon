import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, markInvoiceAsPaid, cancelInvoice, bulkMatchInvoices, getMembersWithInvoices, getInvoiceTypes } from '../api/invoices'
import { getMembers } from '../api/members'
import MemberSearchModal from '../components/MemberSearchModal'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'

export default function Invoices() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('list') // 'list' or 'members'
  const [page, setPage] = useState(1)
  const [membersPage, setMembersPage] = useState(1)
  const [membersSearch, setMembersSearch] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    member_id: '',
    invoice_type: '',
    overdue_only: false,
    month: '',
    sort_by: 'issue_date',
    sort_order: 'desc',
  })
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [showMemberSearch, setShowMemberSearch] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [formData, setFormData] = useState({
    member_id: '',
    all_members: false,
    invoice_type_id: '',
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

  const { data: invoiceTypes } = useQuery({
    queryKey: ['invoice-types'],
    queryFn: () => getInvoiceTypes(true),
  })

  const { data: membersWithInvoicesData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members-with-invoices', membersPage, membersSearch],
    queryFn: () => getMembersWithInvoices({ 
      page: membersPage, 
      per_page: 25,
      search: membersSearch,
      sort_by: 'total_invoices_amount',
      sort_order: 'desc',
    }),
    enabled: activeTab === 'members',
  })

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['invoices'])
      setShowModal(false)
      resetForm()
      
      // Handle bulk creation response
      if (data.generated !== undefined) {
        let message = `✅ Successfully generated ${data.generated} invoice(s)`
        if (data.skipped > 0) {
          message += `\n⚠️ Skipped ${data.skipped} member(s) (already charged or not eligible)`
        }
        if (data.errors && data.errors.length > 0) {
          message += `\n\nErrors:\n${data.errors.slice(0, 5).join('\n')}`
          if (data.errors.length > 5) {
            message += `\n... and ${data.errors.length - 5} more`
          }
        }
        alert(message)
      } else {
        alert('Invoice created successfully!')
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to create invoice'
      if (error.response?.data?.error === 'duplicate_invoice') {
        alert(`❌ ${errorMessage}\n\nThis invoice type can only be issued once per member.`)
      } else {
        alert(`❌ ${errorMessage}`)
      }
    },
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
      all_members: false,
      invoice_type_id: '',
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
    if (!formData.all_members && !formData.member_id) {
      alert('Please select a member or choose "All Members"')
      return
    }
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: formData })
    } else {
      // For bulk creation, remove member_id if all_members is selected
      const submitData = { ...formData }
      if (submitData.all_members) {
        delete submitData.member_id
      } else {
        delete submitData.all_members
      }
      createMutation.mutate(submitData)
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
    const selectedType = invoiceTypes?.find(t => t.id === parseInt(formData.invoice_type_id))
    
    // For after_joining types, set issue_date to member's registration date
    let issueDate = formData.issue_date
    if (selectedType?.charge_type === 'after_joining' && member.date_of_registration) {
      issueDate = member.date_of_registration
    }
    
    setFormData({ ...formData, member_id: member.id, issue_date: issueDate })
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
        metric={activeTab === 'list' ? (pagination?.total || 0) : (membersWithInvoicesData?.meta?.total || 0)}
        metricLabel={activeTab === 'list' ? 'Total Invoices' : 'Total Members'}
        gradient="from-orange-600 to-amber-600"
      />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📋 Invoice List
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            👥 Members Summary
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <>
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
        <h3 className="text-sm font-semibold text-gray-900 mb-4">🔍 Filters & Sorting</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <label className="block text-sm font-medium text-gray-700">Invoice Type</label>
            <select
              value={filters.invoice_type}
              onChange={(e) => {
                setFilters({ ...filters, invoice_type: e.target.value })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="weekly_contribution">📅 Weekly Contributions</option>
              <option value="registration_fee">✅ Registration Fees</option>
              <option value="annual_subscription">📆 Annual Subscriptions</option>
              <option value="software_acquisition">💻 Software Acquisition</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Month/Year</label>
            <input
              type="month"
              value={filters.month}
              onChange={(e) => {
                setFilters({ ...filters, month: e.target.value })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Select month"
            />
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Sort By</label>
            <select
              value={`${filters.sort_by}_${filters.sort_order}`}
              onChange={(e) => {
                const [sort_by, sort_order] = e.target.value.split('_')
                setFilters({ ...filters, sort_by, sort_order })
                setPage(1)
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="issue_date_desc">📅 Issue Date (Newest)</option>
              <option value="issue_date_asc">📅 Issue Date (Oldest)</option>
              <option value="due_date_desc">⏰ Due Date (Latest)</option>
              <option value="due_date_asc">⏰ Due Date (Earliest)</option>
              <option value="invoice_number_desc">🔢 Invoice # (Desc)</option>
              <option value="invoice_number_asc">🔢 Invoice # (Asc)</option>
              <option value="amount_desc">💰 Amount (High-Low)</option>
              <option value="amount_asc">💰 Amount (Low-High)</option>
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
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
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
              invoices.map((invoice) => {
                // Invoice type badge colors
                const typeColors = {
                  'weekly_contribution': 'bg-blue-100 text-blue-800 border-blue-300',
                  'registration_fee': 'bg-green-100 text-green-800 border-green-300',
                  'annual_subscription': 'bg-purple-100 text-purple-800 border-purple-300',
                  'software_acquisition': 'bg-orange-100 text-orange-800 border-orange-300',
                  'custom': 'bg-gray-100 text-gray-800 border-gray-300',
                }
                
                const typeLabels = {
                  'weekly_contribution': '📅 Weekly',
                  'registration_fee': '✅ Registration',
                  'annual_subscription': '📆 Annual',
                  'software_acquisition': '💻 Software',
                  'custom': '📝 Custom',
                }
                
                const typeColor = typeColors[invoice.invoice_type] || typeColors.custom
                const typeLabel = typeLabels[invoice.invoice_type] || 'Invoice'
                
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${typeColor}`}>
                        {typeLabel}
                      </span>
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
                )
              })
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
                  {!editingInvoice && (
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.all_members}
                          onChange={(e) => {
                            setFormData({ ...formData, all_members: e.target.checked, member_id: '' })
                            setSelectedMember(null)
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Issue to All Active Members</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        When enabled, invoice will be created for all active members. Members who already have this invoice type will be skipped.
                      </p>
                    </div>
                  )}
                  {!formData.all_members && (
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
                        <input type="hidden" required={!formData.all_members} value={formData.member_id} />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Type</label>
                    <select
                      value={formData.invoice_type_id}
                      onChange={(e) => {
                        const selectedType = invoiceTypes?.find(t => t.id === parseInt(e.target.value))
                        const updateData = {
                          ...formData,
                          invoice_type_id: e.target.value,
                          amount: selectedType?.default_amount || formData.amount,
                          description: selectedType?.description || formData.description,
                        }
                        
                        // For after_joining types with a selected member, set issue_date to registration date
                        if (selectedType?.charge_type === 'after_joining' && selectedMember?.date_of_registration) {
                          updateData.issue_date = selectedMember.date_of_registration
                        }
                        
                        setFormData(updateData)
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select invoice type (optional)</option>
                      {invoiceTypes?.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.charge_type})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Selecting an invoice type helps prevent duplicate charges for one-time invoices.
                    </p>
                    {formData.invoice_type_id && (() => {
                      const selectedType = invoiceTypes?.find(t => t.id === parseInt(formData.invoice_type_id))
                      if (selectedType?.charge_type === 'after_joining') {
                        return (
                          <p className="mt-1 text-xs text-blue-600 font-medium">
                            ⓘ Issue date will automatically be set to each member's registration date
                          </p>
                        )
                      }
                      return null
                    })()}
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
                    {(() => {
                      const selectedType = invoiceTypes?.find(t => t.id === parseInt(formData.invoice_type_id))
                      const isAfterJoining = selectedType?.charge_type === 'after_joining'
                      
                      if (isAfterJoining && formData.all_members) {
                        return (
                          <div>
                            <input
                              type="date"
                              disabled
                              value={formData.issue_date}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 text-gray-500 sm:text-sm cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-blue-600">
                              Will use each member's registration date automatically
                            </p>
                          </div>
                        )
                      }
                      
                      if (isAfterJoining && selectedMember) {
                        return (
                          <div>
                            <input
                              type="date"
                              disabled
                              value={selectedMember.date_of_registration || formData.issue_date}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 text-gray-500 sm:text-sm cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-blue-600">
                              Will use member's registration date: {selectedMember.date_of_registration ? new Date(selectedMember.date_of_registration).toLocaleDateString() : 'Not set'}
                            </p>
                          </div>
                        )
                      }
                      
                      return (
                        <input
                          type="date"
                          required
                          value={formData.issue_date}
                          onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      )
                    })()}
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
        </>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <input
              type="text"
              placeholder="Search members by name, phone, email, or code..."
              value={membersSearch}
              onChange={(e) => {
                setMembersSearch(e.target.value)
                setMembersPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Members Table */}
          {isLoadingMembers ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoices</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {membersWithInvoicesData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    membersWithInvoicesData?.data?.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.phone || member.email || member.member_code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {member.total_invoices_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(member.total_invoices_amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(member.paid_invoices_amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(member.pending_invoices_amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => navigate(`/members/${member.id}`)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {membersWithInvoicesData?.meta && (
                <Pagination
                  pagination={{
                    current_page: membersWithInvoicesData.meta.current_page || 1,
                    last_page: membersWithInvoicesData.meta.last_page || 1,
                    per_page: membersWithInvoicesData.meta.per_page || 25,
                    total: membersWithInvoicesData.meta.total || 0,
                  }}
                  onPageChange={(newPage) => setMembersPage(newPage)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

