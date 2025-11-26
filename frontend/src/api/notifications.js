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

