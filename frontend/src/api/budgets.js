import api from './axios'

export const getBudgets = async () => {
  const { data } = await api.get('/admin/budgets')
  return data
}

export const createBudget = async (payload) => {
  const { data } = await api.post('/admin/budgets', payload)
  return data
}

export const updateBudgetMonth = async ({ id, payload }) => {
  const { data } = await api.put(`/admin/budget-months/${id}`, payload)
  return data
}

