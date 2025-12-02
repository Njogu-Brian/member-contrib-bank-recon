import api from './axios'

export const getScheduledReports = async (params = {}) => {
  const response = await api.get('/admin/scheduled-reports', { params })
  return response.data
}

export const getScheduledReport = async (id) => {
  const response = await api.get(`/admin/scheduled-reports/${id}`)
  return response.data
}

export const createScheduledReport = async (data) => {
  const response = await api.post('/admin/scheduled-reports', data)
  return response.data
}

export const updateScheduledReport = async (id, data) => {
  const response = await api.put(`/admin/scheduled-reports/${id}`, data)
  return response.data
}

export const deleteScheduledReport = async (id) => {
  const response = await api.delete(`/admin/scheduled-reports/${id}`)
  return response.data
}

export const runScheduledReport = async (id) => {
  const response = await api.post(`/admin/scheduled-reports/${id}/run-now`)
  return response.data
}

export const toggleScheduledReportStatus = async (id) => {
  const response = await api.post(`/admin/scheduled-reports/${id}/toggle-status`)
  return response.data
}

