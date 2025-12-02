import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  runScheduledReport,
  toggleScheduledReportStatus,
} from '../api/scheduledReports'
import { formatDateTime } from '../lib/utils'
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2'
import Pagination from '../components/Pagination'

const REPORT_TYPES = [
  { value: 'summary', label: 'Summary' },
  { value: 'contributions', label: 'Contributions' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'members', label: 'Members Performance' },
  { value: 'transactions', label: 'Transactions' },
]

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
]

export default function ScheduledReports() {
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [formData, setFormData] = useState({
    report_type: 'summary',
    frequency: 'monthly',
    recipients: [''],
    format: ['pdf'],
    filters: {},
    is_active: true,
  })

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-reports', page],
    queryFn: () => getScheduledReports({ page }),
  })

  const createMutation = useMutation({
    mutationFn: createScheduledReport,
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-reports'])
      setShowCreateModal(false)
      setFormData({
        report_type: 'summary',
        frequency: 'monthly',
        recipients: [''],
        format: ['pdf'],
        filters: {},
        is_active: true,
      })
      alert('Scheduled report created successfully!')
    },
    onError: (error) => {
      alert('Failed to create scheduled report: ' + (error.response?.data?.message || error.message))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateScheduledReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-reports'])
      setEditingReport(null)
      setFormData({
        report_type: 'summary',
        frequency: 'monthly',
        recipients: [''],
        format: ['pdf'],
        filters: {},
        is_active: true,
      })
      alert('Scheduled report updated successfully!')
    },
    onError: (error) => {
      alert('Failed to update scheduled report: ' + (error.response?.data?.message || error.message))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledReport,
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-reports'])
      alert('Scheduled report deleted successfully!')
    },
    onError: (error) => {
      alert('Failed to delete scheduled report: ' + (error.response?.data?.message || error.message))
    },
  })

  const runMutation = useMutation({
    mutationFn: runScheduledReport,
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-reports'])
      alert('Report generation queued successfully!')
    },
    onError: (error) => {
      alert('Failed to queue report: ' + (error.response?.data?.message || error.message))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: toggleScheduledReportStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-reports'])
    },
    onError: (error) => {
      alert('Failed to toggle status: ' + (error.response?.data?.message || error.message))
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      name: formData.name?.trim() || null,
      report_type: formData.report_type,
      frequency: formData.frequency,
      recipients: formData.recipients.filter((email) => email.trim() !== ''),
      format: formData.format,
      filters: formData.filters,
      is_active: formData.is_active,
    }

    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleEdit = (report) => {
    setEditingReport(report)
    setFormData({
      name: report.name || '',
      report_type: report.report_type,
      frequency: report.frequency,
      recipients: report.recipients && report.recipients.length > 0 ? report.recipients : [''],
      format: report.format && report.format.length > 0 ? report.format : ['pdf'],
      filters: report.report_params || {},
      is_active: report.is_active !== false,
    })
    setShowCreateModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleAddRecipient = () => {
    setFormData({
      ...formData,
      recipients: [...formData.recipients, ''],
    })
  }

  const handleRecipientChange = (index, value) => {
    const newRecipients = [...formData.recipients]
    newRecipients[index] = value
    setFormData({ ...formData, recipients: newRecipients })
  }

  const handleRemoveRecipient = (index) => {
    const newRecipients = formData.recipients.filter((_, i) => i !== index)
    setFormData({ ...formData, recipients: newRecipients.length > 0 ? newRecipients : [''] })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-gray-600">Manage automated report generation and distribution</p>
        </div>
        <button
          onClick={() => {
            setEditingReport(null)
            setFormData({
              name: '',
              report_type: 'summary',
              frequency: 'monthly',
              recipients: [''],
              format: ['pdf'],
              filters: {},
              is_active: true,
            })
            setShowCreateModal(true)
          }}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
        >
          <HiOutlinePlus className="w-5 h-5 mr-2" />
          Schedule Report
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading scheduled reports...</div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.data?.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.name || REPORT_TYPES.find((t) => t.value === report.report_type)?.label || report.report_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {report.frequency}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {report.recipients?.length || 0} recipient{report.recipients?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.format?.map((f) => f.toUpperCase()).join(', ') || 'PDF'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {report.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          <HiOutlineCheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          <HiOutlineXCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.next_run_at ? formatDateTime(report.next_run_at) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.last_run_at ? formatDateTime(report.last_run_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => runMutation.mutate(report.id)}
                          disabled={runMutation.isPending}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Run now"
                        >
                          <HiOutlinePlay className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(report.id)}
                          className={report.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                          title={report.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {report.is_active ? <HiOutlinePause className="w-5 h-5" /> : <HiOutlineCheckCircle className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleEdit(report)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                      No scheduled reports found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data?.meta && (
            <Pagination
              currentPage={data.meta.current_page}
              totalPages={data.meta.last_page}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Report Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Monthly Summary Report"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Report Type</label>
                  <select
                    value={formData.report_type}
                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    {REPORT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipients (Email)</label>
                  {formData.recipients.map((email, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleRecipientChange(index, e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="email@example.com"
                        required={index === 0}
                      />
                      {formData.recipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Recipient
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Export Format(s)</label>
                  <div className="mt-2 space-y-2">
                    {FORMATS.map((format) => (
                      <label key={format.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.format.includes(format.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, format: [...formData.format, format.value] })
                            } else {
                              setFormData({
                                ...formData,
                                format: formData.format.filter((f) => f !== format.value),
                              })
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          required={formData.format.length === 0 && !e.target.checked}
                        />
                        <span className="ml-2 text-sm text-gray-700">{format.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">Active</label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingReport(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingReport
                        ? 'Update'
                        : 'Create'}
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

