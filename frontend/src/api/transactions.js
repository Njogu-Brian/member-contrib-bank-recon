import api from './axios'

export const getTransactions = async (params = {}) => {
  // Remove empty string values from params to avoid filtering issues
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await api.get('/transactions', { params: cleanParams })
  return response.data
}

export const getTransaction = async (id) => {
  const response = await api.get(`/transactions/${id}`)
  return response.data
}

export const assignTransaction = async (id, memberId) => {
  const response = await api.post(`/transactions/${id}/assign`, { member_id: memberId })
  return response.data
}

export const splitTransaction = async (id, splits) => {
  const response = await api.post(`/transactions/${id}/split`, { splits })
  return response.data
}

export const autoAssign = async () => {
  const response = await api.post('/transactions/auto-assign')
  return response.data
}

export const bulkAssign = async (transactionIds, memberId) => {
  const response = await api.post('/transactions/bulk-assign', {
    transactions: transactionIds,
    member_id: memberId,
  })
  return response.data
}

export const askAi = async (id) => {
  const response = await api.post(`/transactions/${id}/ask-ai`)
  return response.data
}

export const transferTransaction = async (id, toMemberId, notes = '') => {
  const response = await api.post(`/transactions/${id}/transfer`, {
    to_member_id: toMemberId,
    notes: notes,
  })
  return response.data
}

export const archiveTransaction = async (id, reason = '') => {
  const response = await api.post(`/transactions/${id}/archive`, {
    reason: reason || undefined,
  })
  return response.data
}

export const unarchiveTransaction = async (id) => {
  const response = await api.delete(`/transactions/${id}/archive`)
  return response.data
}

export const bulkArchiveTransactions = async (transactionIds, reason = '') => {
  const response = await api.post('/transactions/archive-bulk', {
    transaction_ids: transactionIds,
    reason: reason || undefined,
  })
  return response.data
}


