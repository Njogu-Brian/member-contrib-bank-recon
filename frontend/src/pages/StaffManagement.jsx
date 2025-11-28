import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  toggleStaffStatus,
  sendStaffCredentials,
} from '../api/staff'
import { getRoles } from '../api/roles'
import { getMembers } from '../api/members'
import Pagination from '../components/Pagination'
import useDebounce from '../hooks/useDebounce'
import { 
  HiOutlinePlus, 
  HiOutlineMagnifyingGlass, 
  HiEllipsisVertical,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineShieldCheck,
  HiOutlinePencil,
  HiOutlineLockClosed,
  HiOutlineUserMinus,
  HiOutlineTrash,
  HiOutlineEnvelope,
  HiOutlineDevicePhoneMobile,
  HiOutlineArrowRight
} from 'react-icons/hi2'
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
  const actionButtonRefs = useRef({})
  const dropdownRefs = useRef({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    member_id: '',
    roles: [],
    is_active: true,
    send_credentials_sms: false,
    send_credentials_email: false,
  })
  const [showSendCredentialsModal, setShowSendCredentialsModal] = useState(false)
  const [credentialsPassword, setCredentialsPassword] = useState('')
  const [sendCredentialsOptions, setSendCredentialsOptions] = useState({
    send_sms: true,
    send_email: true,
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter, statusFilter])

  // Position dropdown menus when they open
  useEffect(() => {
    if (showActionsMenu) {
      const buttonEl = actionButtonRefs.current[showActionsMenu]
      const dropdownEl = dropdownRefs.current[showActionsMenu]
      if (buttonEl && dropdownEl) {
        const rect = buttonEl.getBoundingClientRect()
        dropdownEl.style.top = `${rect.bottom + 4}px`
        dropdownEl.style.left = `${rect.right - 224}px` // 224px = dropdown width (w-56 = 14rem = 224px)
      }
    }
  }, [showActionsMenu])

  const { data: staffData, isLoading, error: staffError } = useQuery({
    queryKey: ['staff', { search: debouncedSearch, role: roleFilter, status: statusFilter, page, per_page: perPage }],
    queryFn: () => getStaff({ search: debouncedSearch, role: roleFilter, status: statusFilter, page, per_page: perPage }),
  })

  const { data: rolesData, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: membersData, error: membersError } = useQuery({
    queryKey: ['members', { search: '' }],
    queryFn: () => getMembers({ search: '', per_page: 1000 }),
  })

  const createMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries(['staff'])
      setShowModal(false)
      resetForm()
      alert('Staff member created successfully!')
    },
    onError: (error) => {
      console.error('Error creating staff:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create staff member'
      alert(`Error: ${errorMessage}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff'])
      setShowModal(false)
      setEditingStaff(null)
      resetForm()
      alert('Staff member updated successfully!')
    },
    onError: (error) => {
      console.error('Error updating staff:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update staff member'
      alert(`Error: ${errorMessage}`)
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

  const sendCredentialsMutation = useMutation({
    mutationFn: ({ id, data }) => sendStaffCredentials(id, data),
    onSuccess: (response) => {
      const data = response?.data || {}
      const messages = []
      if (data.sms_sent) messages.push('SMS sent successfully')
      if (data.email_sent) messages.push('Email sent successfully')
      if (messages.length === 0) messages.push('Credentials sent')
      alert(messages.join(', '))
      setShowSendCredentialsModal(false)
      setShowActionsMenu(null)
      setCredentialsPassword('')
    },
    onError: (error) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send credentials'
      alert(`Error: ${errorMessage}`)
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
      send_credentials_sms: false,
      send_credentials_email: false,
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
    
    // Validate required fields
    if (!formData.name || !formData.email) {
      alert('Please fill in all required fields (Name, Email)')
      return
    }
    
    if (!editingStaff && !formData.password) {
      alert('Password is required for new staff members')
      return
    }
    
    if (!formData.roles || formData.roles.length === 0) {
      alert('Please select at least one role')
      return
    }
    
    const submitData = { 
      ...formData,
      member_id: formData.member_id && formData.member_id !== '' ? parseInt(formData.member_id) : null,
    }
    
    if (editingStaff && !submitData.password) {
      delete submitData.password
      // Don't send credentials flags when updating without password
      delete submitData.send_credentials_sms
      delete submitData.send_credentials_email
    }
    
    console.log('Submitting staff data:', submitData)
    
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

  // Handle paginated staff response - axios returns { data: { data: [...], ...pagination } }
  const staffResponse = staffData?.data || staffData
  const staff = Array.isArray(staffResponse?.data) 
    ? staffResponse.data 
    : Array.isArray(staffResponse) 
      ? staffResponse 
      : []
  
  // Handle roles response - axios returns { data: { data: [...] } }
  const rolesResponse = rolesData?.data || rolesData
  const roles = Array.isArray(rolesResponse?.data) 
    ? rolesResponse.data 
    : Array.isArray(rolesResponse) 
      ? rolesResponse 
      : []
  
  // Handle members response - could be paginated or direct array
  const membersResponse = membersData?.data || membersData
  const members = Array.isArray(membersResponse?.data) 
    ? membersResponse.data 
    : Array.isArray(membersResponse) 
      ? membersResponse 
      : []
  
  // Log errors for debugging
  if (staffError) {
    console.error('Staff API Error:', staffError)
    console.error('Staff Error Response:', staffError?.response)
  }
  if (rolesError) {
    console.error('Roles API Error:', rolesError)
    console.error('Roles Error Response:', rolesError?.response)
  }
  if (membersError) {
    console.error('Members API Error:', membersError)
    console.error('Members Error Response:', membersError?.response)
  }

  // Calculate statistics
  const totalStaff = staff.length || 0
  const activeStaff = staff.filter(s => s.is_active).length
  const inactiveStaff = staff.filter(s => !s.is_active).length
  const linkedMembers = staff.filter(s => s.member_id).length

  // Get user initials for avatar
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase() || '?'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage staff accounts, roles, and permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null)
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-sm hover:shadow-md font-medium"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalStaff}</p>
            </div>
            <div className="p-3 bg-brand-100 rounded-xl">
              <HiOutlineUserGroup className="w-6 h-6 text-brand-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{activeStaff}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <HiOutlineCheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{inactiveStaff}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <HiOutlineXCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Linked Members</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{linkedMembers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <HiOutlineShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
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
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading staff members...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff Member</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Linked Member</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roles</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <HiOutlineUserGroup className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-sm font-medium text-gray-900 mb-1">No staff members found</p>
                          <p className="text-xs text-gray-500 mb-4">Get started by adding your first staff member</p>
                          <button
                            onClick={() => {
                              setEditingStaff(null)
                              resetForm()
                              setShowModal(true)
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
                          >
                            <HiOutlinePlus className="w-4 h-4" />
                            Add Staff Member
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                                <span className="text-sm font-semibold text-brand-700">
                                  {getInitials(member.name)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                              <div className="text-xs text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.phone || <span className="text-gray-400">—</span>}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.member ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                              {member.member.name}
                              {member.member.member_code && (
                                <span className="text-blue-600">({member.member.member_code})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {member.roles?.map((role) => (
                              <span
                                key={role.id}
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeClass(role.slug)}`}
                              >
                                {role.name}
                              </span>
                            )) || <span className="text-xs text-gray-400">No roles</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              member.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {member.is_active ? (
                              <>
                                <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                Active
                              </>
                            ) : (
                              <>
                                <HiOutlineXCircle className="w-3.5 h-3.5" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="relative inline-block">
                            <button
                              ref={(el) => {
                                if (el) actionButtonRefs.current[member.id] = el
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowActionsMenu(showActionsMenu === member.id ? null : member.id)
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative z-10"
                              title="More options"
                              aria-label="Actions menu"
                            >
                              <HiEllipsisVertical className="w-5 h-5 text-gray-600" />
                            </button>
                            {showActionsMenu === member.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[90]" 
                                  onClick={() => setShowActionsMenu(null)}
                                ></div>
                                <div 
                                  ref={(el) => {
                                    if (el) dropdownRefs.current[member.id] = el
                                  }}
                                  className="fixed w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden"
                                >
                                  <button
                                    onClick={() => {
                                      handleEdit(member)
                                      setShowActionsMenu(null)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                  >
                                    <HiOutlinePencil className="w-4 h-4" />
                                    Edit Staff Member
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStaff(member)
                                      setFormData({ ...formData, password: '' })
                                      setShowPasswordModal(true)
                                      setShowActionsMenu(null)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                  >
                                    <HiOutlineLockClosed className="w-4 h-4" />
                                    Reset Password
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStaff(member)
                                      setCredentialsPassword('')
                                      setSendCredentialsOptions({ send_sms: true, send_email: true })
                                      setShowSendCredentialsModal(true)
                                      setShowActionsMenu(null)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                  >
                                    <HiOutlineArrowRight className="w-4 h-4" />
                                    Send Credentials
                                  </button>
                                  <button
                                    onClick={() => {
                                      toggleStatusMutation.mutate(member.id)
                                      setShowActionsMenu(null)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                  >
                                    <HiOutlineUserMinus className="w-4 h-4" />
                                    {member.is_active ? 'Deactivate Account' : 'Activate Account'}
                                  </button>
                                  <div className="border-t border-gray-200 my-1"></div>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
                                        deleteMutation.mutate(member.id)
                                        setShowActionsMenu(null)
                                      }
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                  >
                                    <HiOutlineTrash className="w-4 h-4" />
                                    Delete Staff Member
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {staffData?.data && staffResponse && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Showing</span>
                  <span className="font-medium text-gray-900">
                    {((staffResponse.current_page - 1) * perPage) + 1}
                  </span>
                  <span>to</span>
                  <span className="font-medium text-gray-900">
                    {Math.min(staffResponse.current_page * perPage, staffResponse.total || 0)}
                  </span>
                  <span>of</span>
                  <span className="font-medium text-gray-900">{staffResponse.total || 0}</span>
                  <span>entries</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value))
                        setPage(1)
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  {staffResponse.last_page > 1 && (
                    <Pagination
                      currentPage={staffResponse.current_page || 1}
                      totalPages={staffResponse.last_page || 1}
                      onPageChange={setPage}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col modal-form-container">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-brand-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingStaff ? 'Update staff member information and permissions' : 'Create a new staff account with roles and permissions'}
              </p>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {editingStaff ? <span className="text-gray-500 font-normal">(leave blank to keep current)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingStaff}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder={editingStaff ? "Enter new password" : "Minimum 8 characters"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="+254 700 000 000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Link to Member Account <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={formData.member_id || ''}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value || null })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
                >
                  <option value="">None - Staff only account</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.member_code ? `(${member.member_code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                  <HiOutlineShieldCheck className="w-3.5 h-3.5 mt-0.5 text-gray-400" />
                  <span>Link this staff account to a member so they can use the same login credentials for both accounts.</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Assign Roles <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50 max-h-48 overflow-y-auto">
                  {roles.map((role) => (
                    <label 
                      key={role.id} 
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.roles.includes(role.id) 
                          ? 'bg-brand-50 border-2 border-brand-300' 
                          : 'bg-white border-2 border-gray-200 hover:border-brand-200'
                      }`}
                    >
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
                      <span className="text-sm font-medium text-gray-700">{role.name}</span>
                    </label>
                  ))}
                </div>
                {formData.roles.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">Please select at least one role</p>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Account is active (user can login)
                </label>
              </div>

              {!editingStaff && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Send Credentials</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.send_credentials_sms}
                        onChange={(e) => setFormData({ ...formData, send_credentials_sms: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        disabled={!formData.phone}
                      />
                      <div className="flex items-center gap-2">
                        <HiOutlineDevicePhoneMobile className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-900">Send via SMS {formData.phone ? '' : '(phone number required)'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.send_credentials_email}
                        onChange={(e) => setFormData({ ...formData, send_credentials_email: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex items-center gap-2">
                        <HiOutlineEnvelope className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-900">Send via Email</span>
                      </div>
                    </label>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Credentials will include: Name, Email, Password, and Portal Login Link
                  </p>
                </div>
              )}
            </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingStaff(null)
                  resetForm()
                }}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.querySelector('.modal-form-container form')
                  if (form) {
                    form.requestSubmit()
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending || formData.roles.length === 0}
                className="flex-1 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm hover:shadow-md"
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Saving...' 
                  : editingStaff ? 'Update Staff Member' : 'Create Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Credentials Modal */}
      {showSendCredentialsModal && editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-gray-900">Send Credentials</h2>
              <p className="text-sm text-gray-600 mt-1">
                Send login credentials to {editingStaff.name}
              </p>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                if (!sendCredentialsOptions.send_sms && !sendCredentialsOptions.send_email) {
                  alert('Please select at least one delivery method (SMS or Email)')
                  return
                }
                // Password is optional - backend will auto-generate if not provided
                sendCredentialsMutation.mutate({
                  id: editingStaff.id,
                  data: {
                    password: credentialsPassword || undefined, // Only send if provided, otherwise backend generates
                    send_sms: sendCredentialsOptions.send_sms,
                    send_email: sendCredentialsOptions.send_email,
                  },
                })
              }}
              className="p-6 space-y-4"
            >
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Auto-Generated Password:</strong> A secure password will be automatically generated and sent to the staff member. 
                  You can optionally provide a custom password below.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Custom Password (Optional)
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={credentialsPassword}
                  onChange={(e) => setCredentialsPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  placeholder="Leave empty to auto-generate password"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {credentialsPassword 
                    ? 'This custom password will be sent to the staff member' 
                    : 'A secure password will be auto-generated and sent to the staff member'}
                </p>
              </div>

              <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Delivery Method</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendCredentialsOptions.send_sms}
                    onChange={(e) => setSendCredentialsOptions({ ...sendCredentialsOptions, send_sms: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    disabled={!editingStaff.phone}
                  />
                  <div className="flex items-center gap-2">
                    <HiOutlineDevicePhoneMobile className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-900">
                      Send via SMS {editingStaff.phone ? `(${editingStaff.phone})` : '(phone number not set)'}
                    </span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendCredentialsOptions.send_email}
                    onChange={(e) => setSendCredentialsOptions({ ...sendCredentialsOptions, send_email: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex items-center gap-2">
                    <HiOutlineEnvelope className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-900">
                      Send via Email ({editingStaff.email})
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Message will include:</strong> Staff Name, Email, Password, and Portal Login Link
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSendCredentialsModal(false)
                    setCredentialsPassword('')
                    setEditingStaff(null)
                  }}
                  className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendCredentialsMutation.isPending || (credentialsPassword && credentialsPassword.length < 8)}
                  className="flex-1 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendCredentialsMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <HiOutlineArrowRight className="w-4 h-4" />
                      Send Credentials
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-brand-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <p className="text-sm text-gray-600 mt-1">
                Set a new password for {editingStaff?.name || 'this staff member'}
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  placeholder="Minimum 8 characters"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setEditingStaff(null)
                    setFormData({ ...formData, password: '' })
                  }}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

