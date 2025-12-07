import api from './axios'

export const uploadAuditWorkbook = async (file, year) => {
  const formData = new FormData()
  formData.append('file', file)
  if (year) {
    formData.append('year', year)
  }

  const response = await api.post('/admin/audits/contributions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data
}

export const getAuditRuns = async (params = {}) => {
  const response = await api.get('/admin/audits', { params })
  return response.data
}

export const getAuditRun = async (id, params = {}) => {
  const response = await api.get(`/admin/audits/${id}`, { params })
  return response.data
}

export const reanalyzeAuditRun = async (id) => {
  const response = await api.post(`/admin/audits/${id}/reanalyze`)
  return response.data
}

export const deleteAuditRun = async (id) => {
  const response = await api.delete(`/admin/audits/${id}`)
  return response.data
}

export const getMemberAuditResults = async (memberId, params = {}) => {
  const response = await api.get(`/admin/audits/member/${memberId}`, { params })
  return response.data
}

export const getPendingProfileChangesAudit = async (params = {}) => {
  const response = await api.get('/admin/audits/member/pending-profile-changes', { params })
  return response.data
}

export const auditStatements = async (statementId = null) => {
  const response = await api.post('/admin/audits/statements', { statement_id: statementId })
  return response.data
}