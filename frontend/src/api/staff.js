import api from './axios'

export const getStaff = (params = {}) => {
  return api.get('/v1/admin/admin/staff', { params })
}

export const getStaffMember = (id) => {
  return api.get(`/v1/admin/admin/staff/${id}`)
}

export const createStaff = (data) => {
  return api.post('/v1/admin/admin/staff', data)
}

export const updateStaff = (id, data) => {
  return api.put(`/v1/admin/admin/staff/${id}`, data)
}

export const deleteStaff = (id) => {
  return api.delete(`/v1/admin/admin/staff/${id}`)
}

export const resetStaffPassword = (id, data) => {
  return api.post(`/v1/admin/admin/staff/${id}/reset-password`, data)
}

export const toggleStaffStatus = (id) => {
  return api.post(`/v1/admin/admin/staff/${id}/toggle-status`)
}

