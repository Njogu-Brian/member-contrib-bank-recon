import api from './axios'

export const getRoles = (params = {}) => {
  return api.get('/v1/admin/admin/roles', { params })
}

export const getRole = (id) => {
  return api.get(`/v1/admin/admin/roles/${id}`)
}

export const createRole = (data) => {
  return api.post('/v1/admin/admin/roles', data)
}

export const updateRole = (id, data) => {
  return api.put(`/v1/admin/admin/roles/${id}`, data)
}

export const deleteRole = (id) => {
  return api.delete(`/v1/admin/admin/roles/${id}`)
}

