import api from './axios'

export const getWallets = async () => {
  const { data } = await api.get('/admin/wallets')
  return data
}

export const createWallet = async (payload) => {
  const { data } = await api.post('/admin/wallets', payload)
  return data
}

export const addContribution = async ({ walletId, payload }) => {
  const { data } = await api.post(`/admin/wallets/${walletId}/contributions`, payload)
  return data
}

export const getPenalties = async (memberId) => {
  const { data } = await api.get(`/admin/members/${memberId}/penalties`)
  return data
}

