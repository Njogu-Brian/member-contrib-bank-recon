import api from './axios'

export const getNotificationPrefs = async () => {
  const { data } = await api.get('/notification-preferences')
  return data
}

export const updateNotificationPrefs = async (payload) => {
  const { data } = await api.put('/notification-preferences', payload)
  return data
}

export const getNotificationLog = async () => {
  const { data } = await api.get('/notifications/log')
  return data
}

