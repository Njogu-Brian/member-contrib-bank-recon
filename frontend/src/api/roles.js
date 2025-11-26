import { adminApi } from './axios'

export const getRoles = async (params = {}) => {
  const response = await adminApi.get('/roles', { params })
  return response
}

export const getRole = (id) => {
  return adminApi.get(`/roles/${id}`)
}

export const createRole = (data) => {
  return adminApi.post('/roles', data)
}

export const updateRole = (id, data) => {
  return adminApi.put(`/roles/${id}`, data)
}

export const deleteRole = (id) => {
  return adminApi.delete(`/roles/${id}`)
}

