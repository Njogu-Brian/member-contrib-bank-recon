import api from './axios'

export const getActivityLogs = (params = {}) => {
  return api.get('/v1/admin/admin/activity-logs', { params })
}

export const getActivityLog = (id) => {
  return api.get(`/v1/admin/admin/activity-logs/${id}`)
}

export const getActivityLogStatistics = (params = {}) => {
  return api.get('/v1/admin/admin/activity-logs/statistics', { params })
}

