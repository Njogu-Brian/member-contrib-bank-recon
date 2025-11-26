import api from './axios'

export const getExpenses = async (params = {}) => {
  const response = await api.get('/admin/expenses', { params })
  return response.data
}

export const getExpense = async (id) => {
  const response = await api.get(`/admin/expenses/${id}`)
  return response.data
}

export const createExpense = async (data) => {
  const response = await api.post('/admin/expenses', data)
  return response.data
}

export const updateExpense = async (id, data) => {
  const response = await api.put(`/admin/expenses/${id}`, data)
  return response.data
}

export const deleteExpense = async (id) => {
  const response = await api.delete(`/admin/expenses/${id}`)
  return response.data
}

