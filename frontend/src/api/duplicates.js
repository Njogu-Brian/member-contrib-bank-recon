import { adminApi } from './axios'

export const getDuplicates = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined
    )
  )

  const response = await adminApi.get('/duplicates', { params: cleanParams })
  return response.data
}

export const reanalyzeDuplicates = async (statementId = null) => {
  const response = await adminApi.post('/duplicates/reanalyze', {
    statement_id: statementId,
  })
  return response.data
}


