import { adminApi } from './axios'

export const getNotificationPrefs = async () => {
  const { data } = await adminApi.get('/notification-preferences')
  return data
}

export const updateNotificationPrefs = async (payload) => {
  const { data } = await adminApi.put('/notification-preferences', payload)
  return data
}

export const getNotificationLog = async () => {
  const { data } = await adminApi.get('/notifications/log')
  return data
}

