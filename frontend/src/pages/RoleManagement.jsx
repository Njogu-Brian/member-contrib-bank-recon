import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRoles, createRole, updateRole, deleteRole } from '../api/roles'
import { getPermissions } from '../api/permissions'
import { HiOutlinePlus, HiEllipsisVertical } from 'react-icons/hi2'

export default function RoleManagement() {
  const [showModal, setShowModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(null)
  const [editingRole, setEditingRole] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    permissions: [],
  })
  const queryClient = useQueryClient()

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => getPermissions(),
  })

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowModal(false)
      setEditingRole(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowActionsMenu(null)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      permissions: [],
    })
  }

  const handleEdit = (role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || '',
      permissions: role.permissions?.map(p => p.id) || [],
    })
    setShowModal(true)
  }

  const handleEditPermissions = (role) => {
    setEditingRole(role)
    setFormData({
      ...formData,
      permissions: role.permissions?.map(p => p.id) || [],
    })
    setShowPermissionModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handlePermissionSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({ id: editingRole.id, data: { permissions: formData.permissions } })
    setShowPermissionModal(false)
  }

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')
  }

  // Handle roles response 
  // getRoles() returns axios response object, react-query stores it as-is
  // So rolesData = axios response = { data: { data: [...] }, status: 200, ... }
  // Backend returns { data: [...] }
  // So rolesData.data = { data: [...] }
  // And rolesData.data.data = [...]
  const rolesResponse = rolesData?.data
  let roles = []
  if (Array.isArray(rolesResponse?.data)) {
    roles = rolesResponse.data
  } else if (Array.isArray(rolesResponse)) {
    roles = rolesResponse
  } else if (Array.isArray(rolesData)) {
    roles = rolesData
  }
  
  // Handle permissions response - axios returns { data: { permissions: [...], grouped: {...} } }
  // permissionsData from react-query is the axios response.data
  // Backend returns { permissions: [...], grouped: {...} }
  // So permissionsData is { permissions: [...], grouped: {...} }
  const permissionsResponse = permissionsData || permissionsData?.data
  const permissions = Array.isArray(permissionsResponse?.permissions)
    ? permissionsResponse.permissions
    : Array.isArray(permissionsResponse?.data?.permissions)
      ? permissionsResponse.data.permissions
      : []
  const groupedPermissions = permissionsResponse?.grouped || permissionsResponse?.data?.grouped || {}

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage roles and their permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingRole(null)
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Add Role
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!Array.isArray(roles) || roles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      {!Array.isArray(roles) ? 'Loading...' : 'No roles found'}
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{role.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{role.slug}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{role.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{role.permissions?.length || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{role.users?.length || 0}</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setShowActionsMenu(showActionsMenu === role.id ? null : role.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <HiEllipsisVertical className="w-5 h-5 text-gray-600" />
                          </button>
                          {showActionsMenu === role.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={() => {
                                  handleEdit(role)
                                  setShowActionsMenu(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleEditPermissions(role)
                                  setShowActionsMenu(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Manage Permissions
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this role?')) {
                                    deleteMutation.mutate(role.id)
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
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingRole ? 'Edit Role' : 'Add Role'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: editingRole ? formData.slug : generateSlug(e.target.value),
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  {editingRole ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRole(null)
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

      {/* Permission Management Modal */}
      {showPermissionModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Manage Permissions: {editingRole.name}</h2>
            </div>
            <form onSubmit={handlePermissionSubmit} className="p-6">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([module, actions]) => (
                  <div key={module} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 capitalize">{module.replace('_', ' ')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Object.entries(actions).map(([action, perms]) => (
                        <div key={action}>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={perms.some(p => formData.permissions.includes(p.id))}
                              onChange={(e) => {
                                const permIds = perms.map(p => p.id)
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    permissions: [...new Set([...formData.permissions, ...permIds])],
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    permissions: formData.permissions.filter(id => !permIds.includes(id)),
                                  })
                                }
                              }}
                              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{action}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                >
                  Save Permissions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false)
                    setEditingRole(null)
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

