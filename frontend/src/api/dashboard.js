import { adminApi } from './axios'

export const getDashboard = async () => {
  const response = await adminApi.get('/dashboard')
  return response.data
}

