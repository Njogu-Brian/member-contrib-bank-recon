import { adminApi } from './axios'

export const getMembers = async (params = {}) => {
  const response = await adminApi.get('/members', { params })
  return response.data
}

export const getMember = async (id) => {
  const response = await adminApi.get(`/members/${id}`)
  return response.data
}

export const createMember = async (data) => {
  const response = await adminApi.post('/members', data)
  return response.data
}

export const updateMember = async (id, data) => {
  const response = await adminApi.put(`/members/${id}`, data)
  return response.data
}

export const deleteMember = async (id) => {
  const response = await adminApi.delete(`/members/${id}`)
  return response.data
}

export const bulkUploadMembers = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await adminApi.post('/members/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getMemberStatement = async (id, params = {}) => {
  const response = await adminApi.get(`/members/${id}/statement`, { params })
  return response.data
}

export const exportMemberStatement = async (id, params = {}) => {
  const response = await adminApi.get(`/members/${id}/statement/export`, {
    params,
    responseType: 'blob',
  })
  return response
}

export const exportAllMemberStatements = async (params = {}) => {
  const response = await adminApi.get('/members/statements/export', {
    params,
    responseType: 'blob',
  })
  return response
}

