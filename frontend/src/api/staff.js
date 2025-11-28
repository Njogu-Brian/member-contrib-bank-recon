import { adminApi } from './axios'

export const getStaff = async (params = {}) => {
  const response = await adminApi.get('/staff', { params })
  return response
}

export const getStaffMember = (id) => {
  return adminApi.get(`/staff/${id}`)
}

export const createStaff = (data) => {
  return adminApi.post('/staff', data)
}

export const updateStaff = (id, data) => {
  return adminApi.put(`/staff/${id}`, data)
}

export const deleteStaff = (id) => {
  return adminApi.delete(`/staff/${id}`)
}

export const resetStaffPassword = (id, data) => {
  return adminApi.post(`/staff/${id}/reset-password`, data)
}

export const toggleStaffStatus = (id) => {
  return adminApi.post(`/staff/${id}/toggle-status`)
}

export const sendStaffCredentials = (id, data) => {
  return adminApi.post(`/staff/${id}/send-credentials`, data)
}

