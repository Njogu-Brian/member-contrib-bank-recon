import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  toggleStaffStatus,
} from '../api/staff'
import { getRoles } from '../api/roles'
import { getMembers } from '../api/members'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiEllipsisVertical } from 'react-icons/hi2'
import { ROLES, ROLE_LABELS, useRoleBadge } from '../lib/rbac'

// Fix useRoleBadge if not exported
const getRoleBadgeClass = (roleSlug) => {
  switch (roleSlug) {
    case 'super_admin':
      return 'bg-brand-100 text-brand-700'
    case 'chairman':
      return 'bg-amber-100 text-amber-700'
    case 'treasurer':
    case 'group_treasurer':
      return 'bg-emerald-100 text-emerald-700'
    case 'accountant':
      return 'bg-sky-100 text-sky-700'
    case 'secretary':
    case 'group_secretary':
      return 'bg-fuchsia-100 text-fuchsia-700'
    case 'it_support':
      return 'bg-slate-200 text-slate-800'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export default function StaffManagement() {
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [editingStaff, setEditingStaff] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    member_id: '',
    roles: [],
    is_active: true,
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter, statusFilter])

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', { search: debouncedSearch, role: roleFilter, status: statusFilter, page, per_page: perPage }],
    queryFn: () => getStaff({ search: debouncedSearch, role: roleFilter, status: statusFilter, page, per_page: perPage }),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', { search: '' }],
    queryFn: () => getMembers({ search: '', per_page: 1000 }),
  })

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries(['staff'])
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff'])
      setShowModal(false)
      setEditingStaff(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries(['staff'])
      setShowActionsMenu(null)
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, data }) => resetStaffPassword(id, data),
    onSuccess: () => {
      setShowPasswordModal(false)
      setShowActionsMenu(null)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: toggleStaffStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['staff'])
      setShowActionsMenu(null)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      member_id: '',
      roles: [],
      is_active: true,
    })
  }

  const handleEdit = (staff) => {
    setEditingStaff(staff)
    setFormData({
      name: staff.name,
      email: staff.email,
      password: '',
      phone: staff.phone || '',
      member_id: staff.member_id || '',
      roles: staff.roles?.map(r => r.id) || [],
      is_active: staff.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = { ...formData }
    if (editingStaff && !submitData.password) {
      delete submitData.password
    }
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleResetPassword = (e) => {
    e.preventDefault()
    const staff = editingStaff || staffData?.data?.find(s => s.id === showActionsMenu)
    if (staff && formData.password) {
      resetPasswordMutation.mutate({
        id: staff.id,
        data: { password: formData.password, require_change: false },
      })
    }
  }

  const staff = staffData?.data || []
  const roles = rolesData?.data || []
  const members = membersData?.data || []

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage staff accounts and permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null)
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.slug}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No staff members found
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {member.roles?.map((role) => (
                              <span
                                key={role.id}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(role.slug)}`}
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              member.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={() => setShowActionsMenu(showActionsMenu === member.id ? null : member.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <HiEllipsisVertical className="w-5 h-5 text-gray-600" />
                            </button>
                            {showActionsMenu === member.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={() => {
                                    handleEdit(member)
                                    setShowActionsMenu(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingStaff(member)
                                    setFormData({ ...formData, password: '' })
                                    setShowPasswordModal(true)
                                    setShowActionsMenu(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Reset Password
                                </button>
                                <button
                                  onClick={() => {
                                    toggleStatusMutation.mutate(member.id)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {member.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this staff member?')) {
                                      deleteMutation.mutate(member.id)
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {staffData && (
              <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value))
                      setPage(1)
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
                <Pagination
                  currentPage={staffData.current_page}
                  totalPages={staffData.last_page}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingStaff ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Member (Optional)</label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">None</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.member_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roles *</label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, roles: [...formData.roles, role.id] })
                          } else {
                            setFormData({ ...formData, roles: formData.roles.filter((id) => id !== role.id) })
                          }
                        }}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  {editingStaff ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingStaff(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setEditingStaff(null)
                    setFormData({ ...formData, password: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

