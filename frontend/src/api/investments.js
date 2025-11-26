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

