import { adminApi } from './axios'

export const getInvestments = async (params = {}) => {
  const { data } = await adminApi.get('/investments', { params })
  return data
}

export const createInvestment = async (payload) => {
  const { data } = await adminApi.post('/investments', payload)
  return data
}

export const updateInvestment = async ({ id, payload }) => {
  const { data } = await adminApi.put(`/investments/${id}`, payload)
  return data
}

