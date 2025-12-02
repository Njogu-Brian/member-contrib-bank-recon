import api from './axios'

export const getNotificationPrefs = async () => {
  const { data } = await api.get('/admin/notification-preferences')
  return data
}

export const updateNotificationPrefs = async (payload) => {
  const { data } = await api.put('/admin/notification-preferences', payload)
  return data
}

export const getNotificationLog = async () => {
  const { data } = await api.get('/admin/notifications/log')
  return data
}

export const sendWhatsApp = async (payload) => {
  const { data } = await api.post('/admin/notifications/whatsapp/send', payload)
  return data
}

export const sendMonthlyStatements = async (payload) => {
  const { data } = await api.post('/admin/statements/send-monthly', payload)
  return data
}

export const sendContributionReminders = async (payload) => {
  const { data } = await api.post('/admin/contributions/send-reminders', payload)
  return data
}

export const getWhatsAppLogs = async (params = {}) => {
  const { data } = await api.get('/admin/notifications/whatsapp/logs', { params })
  return data
}

