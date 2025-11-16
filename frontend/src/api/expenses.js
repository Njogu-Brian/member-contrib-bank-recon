import api from './axios'

export const getExpenses = async (params = {}) => {
  const response = await api.get('/expenses', { params })
  return response.data
}

export const getExpense = async (id) => {
  const response = await api.get(`/expenses/${id}`)
  return response.data
}

export const createExpense = async (data) => {
  const response = await api.post('/expenses', data)
  return response.data
}

export const updateExpense = async (id, data) => {
  const response = await api.put(`/expenses/${id}`, data)
  return response.data
}

export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`)
  return response.data
}

