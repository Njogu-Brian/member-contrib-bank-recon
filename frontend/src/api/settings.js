import { adminApi } from './axios'

export const getSettings = () => {
  return adminApi.get('/settings')
}

export const updateSettings = (data) => {
  return adminApi.put('/settings', data)
}

