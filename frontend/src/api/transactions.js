import { adminApi } from './axios'

export const getTransactions = async (params = {}) => {
  // Remove empty string values from params to avoid filtering issues
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await adminApi.get('/transactions', { params: cleanParams })
  return response.data
}

export const getTransaction = async (id) => {
  const response = await adminApi.get(`/transactions/${id}`)
  return response.data
}

export const assignTransaction = async (id, memberId) => {
  const response = await adminApi.post(`/transactions/${id}/assign`, { member_id: memberId })
  return response.data
}

export const splitTransaction = async (id, payload) => {
  const response = await adminApi.post(`/transactions/${id}/split`, {
    splits: payload?.splits ?? [],
    notes: payload?.notes,
  })
  return response.data
}

export const autoAssign = async () => {
  const response = await adminApi.post('/transactions/auto-assign')
  return response.data
}

export const bulkAssign = async (transactionIds, memberId) => {
  const response = await adminApi.post('/transactions/bulk-assign', {
    transactions: transactionIds,
    member_id: memberId,
  })
  return response.data
}

export const askAi = async (id) => {
  const response = await adminApi.post(`/transactions/${id}/ask-ai`)
  return response.data
}

export const transferTransaction = async (id, payload) => {
  // Support both single transfer and multiple recipients
  const requestBody = payload.recipients 
    ? { recipients: payload.recipients, notes: payload.notes || '' }
    : { to_member_id: payload.toMemberId, notes: payload.notes || '' }
  
  const response = await adminApi.post(`/transactions/${id}/transfer`, requestBody)
  return response.data
}

export const archiveTransaction = async (id, reason = '') => {
  const response = await adminApi.post(`/transactions/${id}/archive`, {
    reason: reason || undefined,
  })
  return response.data
}

export const unarchiveTransaction = async (id) => {
  const response = await adminApi.delete(`/transactions/${id}/archive`)
  return response.data
}

export const bulkArchiveTransactions = async (transactionIds, reason = '') => {
  const response = await adminApi.post('/transactions/archive-bulk', {
    transaction_ids: transactionIds,
    reason: reason || undefined,
  })
  return response.data
}


