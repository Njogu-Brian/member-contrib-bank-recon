import api from './axios'

export const getMembers = async (params = {}) => {
  const response = await api.get('/admin/members', { params })
  return response.data
}

export const getMember = async (id) => {
  const response = await api.get(`/admin/members/${id}`)
  return response.data
}

export const createMember = async (data) => {
  const response = await api.post('/admin/members', data)
  return response.data
}

export const updateMember = async (id, data) => {
  console.log('Sending update data:', data) // Debug log
  const response = await api.put(`/admin/members/${id}`, data)
  return response.data
}

export const deleteMember = async (id) => {
  const response = await api.delete(`/admin/members/${id}`)
  return response.data
}

export const bulkUploadMembers = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/admin/members/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getMemberStatement = async (id, params = {}) => {
  const response = await api.get(`/admin/members/${id}/statement`, { params })
  return response.data
}

export const exportMemberStatement = async (id, params = {}) => {
  const response = await api.get(`/admin/members/${id}/statement/export`, {
    params,
    responseType: 'blob',
  })
  return response
}

export const exportAllMemberStatements = async (params = {}) => {
  const response = await api.get('/admin/members/statements/export', {
    params,
    responseType: 'blob',
  })
  return response
}

export const getProfileUpdateStatus = async (params = {}) => {
  const response = await api.get('/admin/members/profile-update-status', { params })
  return response.data
}

export const resetMemberProfileLink = async (memberId) => {
  const response = await api.post(`/admin/members/${memberId}/reset-profile-link`)
  return response.data
}

export const resetAllProfileLinks = async () => {
  const response = await api.post('/admin/members/reset-all-profile-links')
  return response.data
}

export const checkDuplicate = async (field, value, memberId = null) => {
  const params = { field, value }
  if (memberId) {
    params.member_id = memberId
  }
  const response = await api.get('/admin/members/check-duplicate', { params })
  return response.data
}

