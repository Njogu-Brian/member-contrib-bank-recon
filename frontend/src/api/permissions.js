import api from './axios'

export const getPermissions = (params = {}) => {
  return api.get('/v1/admin/admin/permissions', { params })
}

export const getPermission = (id) => {
  return api.get(`/v1/admin/admin/permissions/${id}`)
}

export const createPermission = (data) => {
  return api.post('/v1/admin/admin/permissions', data)
}

export const updatePermission = (id, data) => {
  return api.put(`/v1/admin/admin/permissions/${id}`, data)
}

export const deletePermission = (id) => {
  return api.delete(`/v1/admin/admin/permissions/${id}`)
}

