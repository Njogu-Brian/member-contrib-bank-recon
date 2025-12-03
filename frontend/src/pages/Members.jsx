import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  bulkUploadMembers,
  exportAllMemberStatements,
} from '../api/members'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'

export default function Members() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [bulkExportingFormat, setBulkExportingFormat] = useState(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState('pdf')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    member_code: '',
    member_number: '',
    notes: '',
    is_active: true,
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['members', { search: debouncedSearch, page }],
    queryFn: () => getMembers({ search: debouncedSearch, page }),
  })

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      setShowModal(false)
      setEditingMember(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      member_code: '',
      member_number: '',
      notes: '',
      is_active: true,
    })
  }

  const handleEdit = (member) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      member_code: member.member_code || '',
      member_number: member.member_number || '',
      notes: member.notes || '',
      is_active: member.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        await bulkUploadMembers(file)
        queryClient.invalidateQueries(['members'])
        alert('Bulk upload completed!')
      } catch (error) {
        alert('Upload failed: ' + error.message)
      }
    }
  }

  const openExportModal = (format) => {
    setPendingExportFormat(format)
    setIsExportModalOpen(true)
  }

  const handleBulkExport = async (format, memberIds = []) => {
    try {
      setBulkExportingFormat(format)
      const params = { format }
      if (memberIds.length) {
        params.member_ids = memberIds.join(',')
      }
      const response = await exportAllMemberStatements(params)
      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          (format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'),
      })
      let filename = `member-statements.${format === 'excel' ? 'xlsx' : 'pdf'}`
      const disposition = response.headers['content-disposition']
      if (disposition) {
        const match = /filename="?([^"]+)"?/i.exec(disposition)
        if (match?.[1]) {
          filename = match[1]
        }
      }
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
      return true
    } catch (error) {
      alert(error.response?.data?.message || 'Bulk export failed')
      return false
    } finally {
      setBulkExportingFormat(null)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Members</h1>
            <p className="text-blue-100 text-lg">
              Manage your organization's members and track their contributions
            </p>
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-sm text-blue-200">Total Active</div>
            <div className="text-4xl font-bold">{data?.total || 0}</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => openExportModal('pdf')}
              disabled={!!bulkExportingFormat}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {bulkExportingFormat === 'pdf' ? 'Exporting PDF…' : 'Export All (PDF)'}
            </button>
            <button
              onClick={() => openExportModal('excel')}
              disabled={!!bulkExportingFormat}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {bulkExportingFormat === 'excel' ? 'Exporting Excel…' : 'Export All (Excel)'}
            </button>
          </div>
          <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 cursor-pointer transition-colors">
            <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
            📤 Bulk Upload
          </label>
          <button
            onClick={() => {
              setEditingMember(null)
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search members by name, phone, or email..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg bg-white shadow-sm"
      />

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data?.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.member_code || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/members/${member.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View Profile
                    </Link>
                    <button onClick={() => handleEdit(member)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this member?')) {
                          deleteMutation.mutate(member.id)
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
        </div>
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
                  {editingMember ? 'Edit Member' : 'Add Member'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Code</label>
                    <input
                      type="text"
                      value={formData.member_code}
                      onChange={(e) => setFormData({ ...formData, member_code: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Number</label>
                    <input
                      type="text"
                      value={formData.member_number}
                      onChange={(e) => setFormData({ ...formData, member_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
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
                      setEditingMember(null)
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
      {isExportModalOpen && (
        <BulkExportModal
          format={pendingExportFormat}
          isSubmitting={bulkExportingFormat === pendingExportFormat}
          onClose={() => {
            if (!bulkExportingFormat) {
              setIsExportModalOpen(false)
            }
          }}
          onSubmit={async (memberIds) => {
            const ok = await handleBulkExport(pendingExportFormat, memberIds)
            if (ok) {
              setIsExportModalOpen(false)
            }
          }}
        />
      )}
    </div>
  )
}

function BulkExportModal({ format, onClose, onSubmit, isSubmitting }) {
  const [mode, setMode] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['bulk-export-member-search', debouncedSearch],
    queryFn: () => getMembers({ search: debouncedSearch, per_page: 10 }),
    enabled: mode === 'custom',
  })

  const resultItems = searchResults?.data ?? []
  const formatLabel = format === 'excel' ? 'Excel (.xlsx)' : 'PDF (.pdf)'
  const disableClose = isSubmitting

  const addMember = (member) => {
    if (selectedMembers.find((item) => item.id === member.id)) {
      return
    }
    setSelectedMembers((prev) => [...prev, member])
  }

  const removeMember = (memberId) => {
    setSelectedMembers((prev) => prev.filter((member) => member.id !== memberId))
  }

  const handleConfirm = async () => {
    if (mode === 'custom' && selectedMembers.length === 0) {
      alert('Select at least one member or switch back to "All members".')
      return
    }
    await onSubmit(mode === 'all' ? [] : selectedMembers.map((member) => member.id))
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900 bg-opacity-60 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Bulk Export — {formatLabel}</h3>
            <p className="text-sm text-gray-500">Choose who should be included in this export.</p>
          </div>
          <button
            onClick={() => {
              if (!disableClose) onClose()
            }}
            className="text-gray-400 hover:text-gray-600"
            disabled={disableClose}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                value="all"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Export every member
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                value="custom"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Select specific members</span>
            </label>
          </div>

          {mode === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search members</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Start typing a name, phone or member code..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="border rounded-lg max-h-52 overflow-y-auto">
                {isSearching ? (
                  <p className="p-4 text-sm text-gray-500">Searching...</p>
                ) : resultItems.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">No members found.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {resultItems.map((member) => {
                      const alreadyAdded = selectedMembers.some((item) => item.id === member.id)
                      return (
                        <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">
                              {member.phone || '-'} • {member.member_code || `ID #${member.id}`}
                            </p>
                          </div>
                          <button
                            onClick={() => addMember(member)}
                            disabled={alreadyAdded}
                            className="px-3 py-1 text-xs font-semibold rounded-md border border-indigo-200 text-indigo-700 disabled:opacity-40"
                          >
                            {alreadyAdded ? 'Added' : 'Add'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selected members</p>
                {selectedMembers.length === 0 ? (
                  <p className="text-xs text-gray-500">No members selected yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium"
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="text-indigo-500 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={() => {
              if (!disableClose) onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            disabled={disableClose}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Preparing export…' : `Export ${format === 'excel' ? 'Excel' : 'PDF'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

