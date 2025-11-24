import { adminApi } from './axios'

export const getBudgets = async () => {
  const { data } = await adminApi.get('/budgets')
  return data
}

export const createBudget = async (payload) => {
  const { data } = await adminApi.post('/budgets', payload)
  return data
}

export const updateBudgetMonth = async ({ id, payload }) => {
  const { data } = await adminApi.put(`/budget-months/${id}`, payload)
  return data
}

