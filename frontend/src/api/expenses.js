import { adminApi } from './axios'

export const getExpenses = async (params = {}) => {
  const response = await adminApi.get('/expenses', { params })
  return response.data
}

export const getExpense = async (id) => {
  const response = await adminApi.get(`/expenses/${id}`)
  return response.data
}

export const createExpense = async (data) => {
  const response = await adminApi.post('/expenses', data)
  return response.data
}

export const updateExpense = async (id, data) => {
  const response = await adminApi.put(`/expenses/${id}`, data)
  return response.data
}

export const deleteExpense = async (id) => {
  const response = await adminApi.delete(`/expenses/${id}`)
  return response.data
}

