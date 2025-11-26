import { adminApi } from './axios'

export const getPermissions = (params = {}) => {
  return adminApi.get('/permissions', { params })
}

export const getPermission = (id) => {
  return adminApi.get(`/permissions/${id}`)
}

export const createPermission = (data) => {
  return adminApi.post('/permissions', data)
}

export const updatePermission = (id, data) => {
  return adminApi.put(`/permissions/${id}`, data)
}

export const deletePermission = (id) => {
  return adminApi.delete(`/permissions/${id}`)
}

