import api from './axios'

export const getInvestments = async (params = {}) => {
  const { data } = await api.get('/investments', { params })
  return data
}

export const createInvestment = async (payload) => {
  const { data } = await api.post('/investments', payload)
  return data
}

export const updateInvestment = async ({ id, payload }) => {
  const { data } = await api.put(`/investments/${id}`, payload)
  return data
}

