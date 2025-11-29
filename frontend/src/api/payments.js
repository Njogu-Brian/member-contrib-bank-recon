import api from './axios'

export const reconcilePayment = async (paymentId) => {
  const { data } = await api.post(`/admin/payments/${paymentId}/reconcile`)
  return data
}

export const getReconciliationLogs = async (params = {}) => {
  const { data } = await api.get('/admin/payments/reconciliation-logs', { params })
  return data
}

export const retryReconciliation = async (paymentId) => {
  const { data } = await api.post(`/admin/payments/${paymentId}/retry-reconciliation`)
  return data
}

export const syncTransactionsToContributions = async (memberId, params = {}) => {
  const { data } = await api.post(`/admin/members/${memberId}/sync-transactions`, params)
  return data
}

