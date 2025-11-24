import { adminApi } from './axios'

export const getStatements = async (params = {}) => {
  // Remove empty string values from params
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  )
  const response = await adminApi.get('/statements', { params: cleanParams })
  return response.data
}

export const getStatement = async (id) => {
  const response = await adminApi.get(`/statements/${id}`)
  return response.data
}

export const uploadStatement = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await adminApi.post('/statements/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deleteStatement = async (id) => {
  const response = await adminApi.delete(`/statements/${id}`)
  return response.data
}

export const reanalyzeStatement = async (id) => {
  const response = await adminApi.post(`/statements/${id}/reanalyze`)
  return response.data
}

export const reanalyzeAllStatements = async () => {
  const response = await adminApi.post('/statements/reanalyze-all')
  return response.data
}

export const getStatementDocumentMetadata = async (id) => {
  const response = await adminApi.get(`/statements/${id}/document-metadata`)
  return response.data
}

