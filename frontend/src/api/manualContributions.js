import api from './axios'

export const getManualContributions = async (params = {}) => {
  const response = await api.get('/manual-contributions', { params })
  return response.data
}

export const getManualContribution = async (id) => {
  const response = await api.get(`/manual-contributions/${id}`)
  return response.data
}

export const createManualContribution = async (data) => {
  const response = await api.post('/manual-contributions', data)
  return response.data
}

export const updateManualContribution = async (id, data) => {
  const response = await api.put(`/manual-contributions/${id}`, data)
  return response.data
}

export const deleteManualContribution = async (id) => {
  const response = await api.delete(`/manual-contributions/${id}`)
  return response.data
}

export const importExcel = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/manual-contributions/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

