import api from './axios'

export const getWallets = async () => {
  const { data } = await api.get('/wallets')
  return data
}

export const createWallet = async (payload) => {
  const { data } = await api.post('/wallets', payload)
  return data
}

export const addContribution = async ({ walletId, payload }) => {
  const { data } = await api.post(`/wallets/${walletId}/contributions`, payload)
  return data
}

export const getPenalties = async (memberId) => {
  const { data } = await api.get(`/members/${memberId}/penalties`)
  return data
}

