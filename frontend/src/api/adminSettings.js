import api from './axios'

export const getAdminSettings = () => {
  return api.get('/v1/admin/admin/settings')
}

export const updateAdminSettings = (data) => {
  return api.put('/v1/admin/admin/settings', data)
}

