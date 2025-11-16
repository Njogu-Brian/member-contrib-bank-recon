import api from './axios'

export const uploadAuditWorkbook = async (file, year) => {
  const formData = new FormData()
  formData.append('file', file)
  if (year) {
    formData.append('year', year)
  }

  const response = await api.post('/audits/contributions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data
}

export const getAuditRuns = async (params = {}) => {
  const response = await api.get('/audits', { params })
  return response.data
}

export const getAuditRun = async (id, params = {}) => {
  const response = await api.get(`/audits/${id}`, { params })
  return response.data
}

export const reanalyzeAuditRun = async (id) => {
  const response = await api.post(`/audits/${id}/reanalyze`)
  return response.data
}

export const deleteAuditRun = async (id) => {
  const response = await api.delete(`/audits/${id}`)
  return response.data
}

export const getMemberAuditResults = async (memberId, params = {}) => {
  const response = await api.get(`/audits/member/${memberId}`, { params })
  return response.data
}

