import api from './axios'

export const getContributionStatuses = async () => {
  const response = await api.get('/contribution-statuses')
  return response.data.data
}

export const createContributionStatus = (payload) => {
  return api.post('/contribution-statuses', payload)
}

export const updateContributionStatus = (id, payload) => {
  return api.put(`/contribution-statuses/${id}`, payload)
}

export const deleteContributionStatus = (id) => {
  return api.delete(`/contribution-statuses/${id}`)
}

export const reorderContributionStatuses = (order) => {
  return api.post('/contribution-statuses/reorder', { order })
}

