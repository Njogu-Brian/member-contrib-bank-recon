import api from './axios'

const adminBase = '/admin'

export const getInvoiceTypes = async (params = {}) => {
  const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
  const response = await api.get(`${adminBase}/invoice-types`, { params: cleanParams })
  return response.data
}

export const getInvoiceType = async (id) => {
  const response = await api.get(`${adminBase}/invoice-types/${id}`)
  return response.data
}

export const createInvoiceType = async (data) => {
  const response = await api.post(`${adminBase}/invoice-types`, data)
  return response.data
}

export const updateInvoiceType = async (id, data) => {
  const response = await api.put(`${adminBase}/invoice-types/${id}`, data)
  return response.data
}

export const deleteInvoiceType = async (id) => {
  const response = await api.delete(`${adminBase}/invoice-types/${id}`)
  return response.data
}

