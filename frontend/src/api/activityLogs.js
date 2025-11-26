import { adminApi } from './axios'

export const getActivityLogs = (params = {}) => {
  return adminApi.get('/activity-logs', { params })
}

export const getActivityLog = (id) => {
  return adminApi.get(`/activity-logs/${id}`)
}

export const getActivityLogStatistics = (params = {}) => {
  return adminApi.get('/activity-logs/statistics', { params })
}

