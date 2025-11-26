import api from './axios'

export const getMfaSetup = async () => {
  const response = await api.get('/auth/mfa/setup')
  return response.data
}

export const enableMfa = async (code) => {
  const response = await api.post('/auth/mfa/enable', { code })
  return response.data
}

export const disableMfa = async (code) => {
  const response = await api.post('/auth/mfa/disable', { code })
  return response.data
}

export const verifyMfa = async (code) => {
  const response = await api.post('/auth/mfa/verify', { code })
  return response.data
}

