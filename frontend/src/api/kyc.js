import api from './axios'

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

