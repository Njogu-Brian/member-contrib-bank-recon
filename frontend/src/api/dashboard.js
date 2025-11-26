import api from './axios'

export const getDashboard = async () => {
  const response = await api.get('/admin/dashboard')
  return response.data
}

