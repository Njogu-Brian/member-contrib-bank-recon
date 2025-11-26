import api from './axios'

const adminBase = '/admin'

export const getTransactions = async (params = {}) => {
  // Remove empty string values from params to avoid filtering issues
  // But keep 0 and false values as they are valid filter values
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => {
      // Keep 0, false, and numeric values
      if (value === 0 || value === false || typeof value === 'number') {
        return true
      }
      // Remove empty strings, null, undefined
      return value !== '' && value !== null && value !== undefined
    })
  )
  const response = await api.get('/admin/transactions', { params: cleanParams })
  return response.data
}

export const getTransaction = async (id) => {
  const response = await api.get(`/admin/transactions/${id}`)
  return response.data
}

export const assignTransaction = async (id, memberId) => {
  const response = await api.post(`${adminBase}/transactions/${id}/assign`, { member_id: memberId })
  return response.data
}

export const splitTransaction = async (id, payload) => {
  const response = await api.post(`${adminBase}/transactions/${id}/split`, {
    splits: payload?.splits ?? [],
    notes: payload?.notes,
  })
  return response.data
}

export const autoAssign = async () => {
  const response = await api.post(`${adminBase}/transactions/auto-assign`)
  return response.data
}

export const bulkAssign = async (transactionIds, memberId) => {
  const response = await api.post(`${adminBase}/transactions/bulk-assign`, {
    transactions: transactionIds,
    member_id: memberId,
  })
  return response.data
}

export const askAi = async (id) => {
  const response = await api.post(`${adminBase}/transactions/${id}/ask-ai`)
  return response.data
}

export const transferTransaction = async (id, payload) => {
  // Support both single transfer and multiple recipients
  const requestBody = payload.recipients 
    ? { recipients: payload.recipients, notes: payload.notes || '' }
    : { to_member_id: payload.toMemberId, notes: payload.notes || '' }
  
  const response = await api.post(`${adminBase}/transactions/${id}/transfer`, requestBody)
  return response.data
}

export const archiveTransaction = async (id, reason = '') => {
  try {
    console.log('API: Archiving transaction', id, 'with reason:', reason)
    const response = await api.post(`${adminBase}/transactions/${id}/archive`, {
      reason: reason || undefined,
    })
    console.log('API: Archive response:', response.data)
    return response.data
  } catch (error) {
    console.error('API: Archive error:', error)
    console.error('API: Archive error response:', error.response)
    throw error
  }
}

export const unarchiveTransaction = async (id) => {
  const response = await api.delete(`${adminBase}/transactions/${id}/archive`)
  return response.data
}

export const bulkArchiveTransactions = async (transactionIds, reason = '') => {
  const response = await api.post(`${adminBase}/transactions/archive-bulk`, {
    transaction_ids: transactionIds,
    reason: reason || undefined,
  })
  return response.data
}


