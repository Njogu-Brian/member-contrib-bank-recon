import api from './axios'

export const getSummary = async (params = {}) => {
  const response = await api.get('/reports/summary', { params })
  return response.data
}

export const getDepositReport = async () => {
  const response = await api.get('/reports/deposits')
  return response.data
}

export const getExpensesReport = async (params = {}) => {
  const response = await api.get('/reports/expenses', { params })
  return response.data
}

export const getMembersReport = async (status = null) => {
  const response = await api.get('/reports/members', { params: { status } })
  return response.data
}

export const getTransactionsReport = async (params = {}) => {
  const response = await api.get('/reports/transactions', { params })
  return response.data
}

