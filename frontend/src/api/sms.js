import { adminApi } from './axios'

export const getSmsLogs = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await adminApi.get('/sms/logs', { params: cleanParams })
  return response.data
}

export const getSmsStatistics = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await adminApi.get('/sms/statistics', { params: cleanParams })
  return response.data
}

export const sendBulkSms = async (memberIds, message, senderId = null, customNumbers = null, includeContributionStatus = false, includeStatementLink = false) => {
  const payload = {
    message,
  }
  
  if (memberIds && memberIds.length > 0) {
    payload.member_ids = memberIds
  }
  
  if (customNumbers && customNumbers.length > 0) {
    payload.custom_numbers = customNumbers
  }
  
  if (senderId) {
    payload.sender_id = senderId
  }
  
  if (includeContributionStatus) {
    payload.include_contribution_status = true
  }
  
  if (includeStatementLink) {
    payload.include_statement_link = true
  }
  
  const response = await adminApi.post('/sms/bulk', payload)
  return response.data
}

export const sendSingleSms = async (memberId, message, senderId = null) => {
  const response = await adminApi.post(`/sms/members/${memberId}`, {
    message,
    sender_id: senderId,
  })
  return response.data
}

