import { adminApi } from './axios'

export const getWallets = async () => {
  const { data } = await adminApi.get('/wallets')
  return data
}

export const createWallet = async (payload) => {
  const { data } = await adminApi.post('/wallets', payload)
  return data
}

export const addContribution = async ({ walletId, payload }) => {
  const { data } = await adminApi.post(`/wallets/${walletId}/contributions`, payload)
  return data
}

export const getPenalties = async (memberId) => {
  const { data } = await adminApi.get(`/members/${memberId}/penalties`)
  return data
}

