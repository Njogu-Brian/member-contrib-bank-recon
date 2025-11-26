import api from './axios'

export const getMeetings = async () => {
  const { data } = await api.get('/admin/meetings')
  return data
}

export const createMeeting = async (payload) => {
  const { data } = await api.post('/admin/meetings', payload)
  return data
}

export const addAgendaItem = async ({ meetingId, payload }) => {
  const { data } = await api.post(`/admin/meetings/${meetingId}/agendas`, payload)
  return data
}

export const proposeMotion = async ({ meetingId, payload }) => {
  const { data } = await api.post(`/admin/meetings/${meetingId}/motions`, payload)
  return data
}

export const castVote = async ({ motionId, payload }) => {
  const { data } = await api.post(`/admin/motions/${motionId}/votes`, payload)
  return data
}

