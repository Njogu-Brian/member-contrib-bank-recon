import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoiceTypes, createInvoiceType, updateInvoiceType, deleteInvoiceType } from '../api/invoiceTypes'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'

const CHARGE_TYPES = [
  { value: 'once', label: 'Once', description: 'Charge one time only' },
  { value: 'yearly', label: 'Yearly', description: 'Charge once per year' },
  { value: 'monthly', label: 'Monthly', description: 'Charge once per month' },
  { value: 'weekly', label: 'Weekly', description: 'Charge once per week' },
  { value: 'after_joining', label: 'After Joining', description: 'Charge once when member joins' },
  { value: 'custom', label: 'Custom', description: 'Manual charge only' },
]

export default function InvoiceTypes() {
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    charge_type: 'once',
    charge_interval_days: null,
    default_amount: '0',
    due_days: '30',
    is_active: true,
    sort_order: '0',
    metadata: {},
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-types', page],
    queryFn: () => getInvoiceTypes({ page, per_page: 25 }),
  })

  const createMutation = useMutation({
    mutationFn: createInvoiceType,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice-types'])
      setShowModal(false)
      resetForm()
      alert('Invoice type created successfully!')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to create invoice type')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateInvoiceType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice-types'])
      setShowModal(false)
      setEditingType(null)
      resetForm()
      alert('Invoice type updated successfully!')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to update invoice type')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInvoiceType,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice-types'])
      alert('Invoice type deleted successfully!')
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to delete invoice type')
    },
  })

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      charge_type: 'once',
      charge_interval_days: null,
      default_amount: '0',
      due_days: '30',
      is_active: true,
      sort_order: '0',
      metadata: {},
    })
    setEditingType(null)
  }

  const handleEdit = (type) => {
    setEditingType(type)
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      charge_type: type.charge_type,
      charge_interval_days: type.charge_interval_days || null,
      default_amount: type.default_amount || '0',
      due_days: type.due_days || '30',
      is_active: type.is_active,
      sort_order: type.sort_order || '0',
      metadata: type.metadata || {},
    })
    setShowModal(true)
  }

  const handleDelete = (type) => {
    if (confirm(`Delete invoice type "${type.name}"? This cannot be undone if invoices are using this type.`)) {
      deleteMutation.mutate(type.id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      default_amount: parseFloat(formData.default_amount),
      due_days: parseInt(formData.due_days),
      sort_order: parseInt(formData.sort_order),
      charge_interval_days: formData.charge_interval_days ? parseInt(formData.charge_interval_days) : null,
    }

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const invoiceTypes = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
  const pagination = data && !Array.isArray(data) ? data : {}

  const getChargeTypeInfo = (chargeType) => {
    return CHARGE_TYPES.find(t => t.value === chargeType) || CHARGE_TYPES[0]
  }

  const getChargeTypeColor = (chargeType) => {
    const colors = {
      once: 'bg-purple-100 text-purple-800',
      yearly: 'bg-blue-100 text-blue-800',
      monthly: 'bg-green-100 text-green-800',
      weekly: 'bg-yellow-100 text-yellow-800',
      after_joining: 'bg-indigo-100 text-indigo-800',
      custom: 'bg-gray-100 text-gray-800',
    }
    return colors[chargeType] || colors.custom
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Types"
        description="Manage invoice types and their charge schedules"
        metric={pagination?.total || 0}
        metricLabel="Total Types"
        gradient="from-purple-600 to-indigo-600"
      />

      <div className="flex justify-end">
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          + Create Invoice Type
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charge Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Default Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due Days</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoiceTypes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                    No invoice types found. Create your first invoice type to get started.
                  </td>
                </tr>
              ) : (
                invoiceTypes.map((type) => {
                  const chargeInfo = getChargeTypeInfo(type.charge_type)
                  return (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                        {type.description && (
                          <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">{type.code}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChargeTypeColor(type.charge_type)}`}>
                          {chargeInfo.label}
                        </span>
                        {type.charge_interval_days && (
                          <div className="text-xs text-gray-500 mt-1">Every {type.charge_interval_days} days</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(type.default_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {type.due_days} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          type.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {pagination && pagination.last_page > 1 && (
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
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingType ? 'Edit Invoice Type' : 'Create Invoice Type'}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="e.g., Registration Fee"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Code *</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingType}
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                        placeholder="e.g., registration_fee"
                      />
                      <p className="mt-1 text-xs text-gray-500">Unique identifier (cannot be changed)</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Describe this invoice type..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Charge Type *</label>
                    <select
                      required
                      value={formData.charge_type}
                      onChange={(e) => {
                        const selected = CHARGE_TYPES.find(t => t.value === e.target.value)
                        setFormData({
                          ...formData,
                          charge_type: e.target.value,
                          charge_interval_days: e.target.value === 'weekly' ? 7 : e.target.value === 'monthly' ? 30 : e.target.value === 'yearly' ? 365 : null,
                        })
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {CHARGE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} - {type.description}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {CHARGE_TYPES.find(t => t.value === formData.charge_type)?.description}
                    </p>
                  </div>
                  {formData.charge_type !== 'once' && formData.charge_type !== 'after_joining' && formData.charge_type !== 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Charge Interval (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.charge_interval_days || ''}
                        onChange={(e) => setFormData({ ...formData, charge_interval_days: e.target.value || null })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="e.g., 30 for monthly"
                      />
                      <p className="mt-1 text-xs text-gray-500">Days between charges (auto-filled for common types)</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Default Amount (KES) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.default_amount}
                        onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Due Days *</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        value={formData.due_days}
                        onChange={(e) => setFormData({ ...formData, due_days: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">Inactive types won't be included in automated invoice generation</p>
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
                      setEditingType(null)
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

