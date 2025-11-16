import api from './axios'

export const getDuplicates = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined
    )
  )

  const response = await api.get('/duplicates', { params: cleanParams })
  return response.data
}


