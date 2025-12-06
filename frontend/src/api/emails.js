import api from './axios'

export const getEmailLogs = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await api.get('/admin/emails/logs', { params: cleanParams })
  return response.data
}

export const getEmailStatistics = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await api.get('/admin/emails/statistics', { params: cleanParams })
  return response.data
}

export const sendBulkEmail = async (memberIds, subject, message, customEmails = null, includeContributionStatus = false, includeStatementLink = false) => {
  const payload = {
    subject,
    message,
  }
  
  if (memberIds && memberIds.length > 0) {
    payload.member_ids = memberIds
  }
  
  if (customEmails && customEmails.length > 0) {
    payload.custom_emails = customEmails
  }
  
  if (includeContributionStatus) {
    payload.include_contribution_status = true
  }
  
  if (includeStatementLink) {
    payload.include_statement_link = true
  }
  
  const response = await api.post('/admin/emails/bulk', payload)
  return response.data
}

