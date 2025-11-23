import api from './axios'

export const getAnnouncements = async () => {
  const { data } = await api.get('/announcements')
  return data
}

export const createAnnouncement = async (payload) => {
  const { data } = await api.post('/announcements', payload)
  return data
}

export const updateAnnouncement = async ({ id, payload }) => {
  const { data } = await api.put(`/announcements/${id}`, payload)
  return data
}

export const deleteAnnouncement = async (id) => {
  await api.delete(`/announcements/${id}`)
}

