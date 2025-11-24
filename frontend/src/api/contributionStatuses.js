import { adminApi } from './axios'

export const getContributionStatuses = async () => {
  const response = await adminApi.get('/contribution-statuses')
  return response.data.data
}

export const createContributionStatus = (payload) => {
  return adminApi.post('/contribution-statuses', payload)
}

export const updateContributionStatus = (id, payload) => {
  return adminApi.put(`/contribution-statuses/${id}`, payload)
}

export const deleteContributionStatus = (id) => {
  return adminApi.delete(`/contribution-statuses/${id}`)
}

export const reorderContributionStatuses = (order) => {
  return adminApi.post('/contribution-statuses/reorder', { order })
}

