import api from './axios'

export const getInvestments = async (params = {}) => {
  const { data } = await api.get('/admin/investments', { params })
  return data
}

export const createInvestment = async (payload) => {
  const { data } = await api.post('/admin/investments', payload)
  return data
}

export const updateInvestment = async ({ id, payload }) => {
  const { data } = await api.put(`/admin/investments/${id}`, payload)
  return data
}

export const calculateRoi = async (investmentId, params = {}) => {
  const { data } = await api.post(`/admin/investments/${investmentId}/calculate-roi`, params)
  return data
}

export const getRoiHistory = async (investmentId) => {
  const { data } = await api.get(`/admin/investments/${investmentId}/roi-history`)
  return data
}

export const processPayout = async (investmentId, payoutId, payload = {}) => {
  const { data } = await api.post(`/admin/investments/${investmentId}/payout/${payoutId}`, payload)
  return data
}

