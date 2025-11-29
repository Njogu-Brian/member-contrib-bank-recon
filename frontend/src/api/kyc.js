import api from './axios'

// Mobile API endpoints
export const getKycProfile = async () => {
  const { data } = await api.get('/mobile/kyc/profile')
  return data
}

export const updateKycProfile = async (payload) => {
  const { data } = await api.put('/mobile/kyc/profile', payload)
  return data
}

export const uploadKycDocument = async (formData) => {
  const { data } = await api.post('/mobile/kyc/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const enableMfa = async (payload) => {
  const { data } = await api.post('/mobile/mfa/enable', payload)
  return data
}

export const disableMfa = async () => {
  const { data } = await api.post('/mobile/mfa/disable')
  return data
}

// Admin API endpoints
export const getPendingKycDocuments = async (params = {}) => {
  const { data } = await api.get('/admin/kyc/pending', { params })
  return data
}

export const approveKycDocument = async (documentId, payload = {}) => {
  const { data } = await api.post(`/admin/kyc/${documentId}/approve`, payload)
  return data
}

export const rejectKycDocument = async (documentId, payload) => {
  const { data } = await api.post(`/admin/kyc/${documentId}/reject`, payload)
  return data
}

export const activateMember = async (memberId) => {
  const { data } = await api.post(`/admin/members/${memberId}/activate`)
  return data
}

