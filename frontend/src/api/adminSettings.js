import api from './axios'

export const getAdminSettings = () => {
  return api.get('/admin/settings')
}

export const updateAdminSettings = (data) => {
  return api.put('/admin/settings', data)
}

