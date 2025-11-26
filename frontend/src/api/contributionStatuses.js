import api from './axios'

export const getContributionStatuses = async () => {
  const response = await api.get('/admin/contribution-statuses')
  return response.data.data || response.data
}

export const createContributionStatus = (payload) => {
  return api.post('/admin/contribution-statuses', payload)
}

export const updateContributionStatus = (id, payload) => {
  return api.put(`/admin/contribution-statuses/${id}`, payload)
}

export const deleteContributionStatus = (id) => {
  return api.delete(`/admin/contribution-statuses/${id}`)
}

export const reorderContributionStatuses = (order) => {
  return api.post('/admin/contribution-statuses/reorder', { order })
}

