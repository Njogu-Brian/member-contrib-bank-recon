import api from './axios'

export const getMembers = async (params = {}) => {
  const response = await api.get('/members', { params })
  return response.data
}

export const getMember = async (id) => {
  const response = await api.get(`/members/${id}`)
  return response.data
}

export const createMember = async (data) => {
  const response = await api.post('/members', data)
  return response.data
}

export const updateMember = async (id, data) => {
  const response = await api.put(`/members/${id}`, data)
  return response.data
}

export const deleteMember = async (id) => {
  const response = await api.delete(`/members/${id}`)
  return response.data
}

export const bulkUploadMembers = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/members/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getMemberStatement = async (id, params = {}) => {
  const response = await api.get(`/members/${id}/statement`, { params })
  return response.data
}

export const exportMemberStatement = async (id, params = {}) => {
  const response = await api.get(`/members/${id}/statement/export`, {
    params,
    responseType: 'blob',
  })
  return response
}

export const exportAllMemberStatements = async (params = {}) => {
  const response = await api.get('/members/statements/export', {
    params,
    responseType: 'blob',
  })
  return response
}

