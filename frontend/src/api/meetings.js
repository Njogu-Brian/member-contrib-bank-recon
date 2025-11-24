import { adminApi } from './axios'

export const getMeetings = async () => {
  const { data } = await adminApi.get('/meetings')
  return data
}

export const createMeeting = async (payload) => {
  const { data } = await adminApi.post('/meetings', payload)
  return data
}

export const addAgendaItem = async ({ meetingId, payload }) => {
  const { data } = await adminApi.post(`/meetings/${meetingId}/agendas`, payload)
  return data
}

export const proposeMotion = async ({ meetingId, payload }) => {
  const { data } = await adminApi.post(`/meetings/${meetingId}/motions`, payload)
  return data
}

export const castVote = async ({ motionId, payload }) => {
  const { data } = await adminApi.post(`/motions/${motionId}/votes`, payload)
  return data
}

