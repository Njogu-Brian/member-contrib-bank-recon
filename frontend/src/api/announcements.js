import { adminApi } from './axios'

export const getAnnouncements = async () => {
  const { data } = await adminApi.get('/announcements')
  return data
}

export const createAnnouncement = async (payload) => {
  const { data } = await adminApi.post('/announcements', payload)
  return data
}

export const updateAnnouncement = async ({ id, payload }) => {
  const { data } = await adminApi.put(`/announcements/${id}`, payload)
  return data
}

export const deleteAnnouncement = async (id) => {
  await adminApi.delete(`/announcements/${id}`)
}

