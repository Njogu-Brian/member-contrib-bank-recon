import { adminApi } from './axios'

export const getManualContributions = async (params = {}) => {
  const response = await adminApi.get('/manual-contributions', { params })
  return response.data
}

export const getManualContribution = async (id) => {
  const response = await adminApi.get(`/manual-contributions/${id}`)
  return response.data
}

export const createManualContribution = async (data) => {
  const response = await adminApi.post('/manual-contributions', data)
  return response.data
}

export const updateManualContribution = async (id, data) => {
  const response = await adminApi.put(`/manual-contributions/${id}`, data)
  return response.data
}

export const deleteManualContribution = async (id) => {
  const response = await adminApi.delete(`/manual-contributions/${id}`)
  return response.data
}

export const importExcel = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await adminApi.post('/manual-contributions/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

