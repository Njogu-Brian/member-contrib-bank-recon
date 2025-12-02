import api from './axios'
import { downloadBlob } from '../lib/utils'

export const getSummary = async (params = {}) => {
  const response = await api.get('/admin/reports/summary', { params })
  return response.data
}

export const getDepositReport = async () => {
  const response = await api.get('/admin/reports/deposits')
  return response.data
}

export const getExpensesReport = async (params = {}) => {
  const response = await api.get('/admin/reports/expenses', { params })
  return response.data
}

export const getMembersReport = async (status = null) => {
  const response = await api.get('/admin/reports/members', { params: { status } })
  return response.data
}

export const getTransactionsReport = async (params = {}) => {
  const response = await api.get('/admin/reports/transactions', { params })
  return response.data
}

/**
 * Export report in specified format
 */
export const exportReport = async (type, format, params = {}) => {
  const response = await api.get(`/admin/reports/${type}/export`, {
    params: { ...params, format },
    responseType: 'blob',
  })
  
  const filename = `${type}-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`
  downloadBlob(response.data, filename)
  return response.data
}

