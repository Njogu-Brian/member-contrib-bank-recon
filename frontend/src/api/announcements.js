import api from './axios'

export const getAnnouncements = async () => {
  const { data } = await api.get('/admin/announcements')
  return data
}

export const createAnnouncement = async (payload) => {
  const { data } = await api.post('/admin/announcements', payload)
  return data
}

export const updateAnnouncement = async ({ id, payload }) => {
  const { data } = await api.put(`/admin/announcements/${id}`, payload)
  return data
}

export const deleteAnnouncement = async (id) => {
  await api.delete(`/admin/announcements/${id}`)
}

