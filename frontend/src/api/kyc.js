import api from './axios'

export const getKycProfile = async () => {
  const { data } = await api.get('/kyc/profile')
  return data
}

export const updateKycProfile = async (payload) => {
  const { data } = await api.put('/kyc/profile', payload)
  return data
}

export const uploadKycDocument = async (formData) => {
  const { data } = await api.post('/kyc/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const enableMfa = async (payload) => {
  const { data } = await api.post('/mfa/enable', payload)
  return data
}

export const disableMfa = async () => {
  const { data } = await api.post('/mfa/disable')
  return data
}

