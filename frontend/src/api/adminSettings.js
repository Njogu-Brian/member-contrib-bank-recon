import api from './axios'

export const getAdminSettings = () => {
  return api.get('/api/v1/admin/settings')
}

export const updateAdminSettings = (data) => {
  return api.put('/api/v1/admin/settings', data)
}

