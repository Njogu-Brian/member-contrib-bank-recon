import api from './axios'

export const getInvoices = async (params = {}) => {
  // Clean up params - remove empty strings
  const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
  
  const response = await api.get('/admin/invoices', { params: cleanParams })
  return response.data
}

export const getInvoice = async (id) => {
  const response = await api.get(`/admin/invoices/${id}`)
  return response.data
}

export const createInvoice = async (data) => {
  const response = await api.post('/admin/invoices', data)
  return response.data
}

export const updateInvoice = async (id, data) => {
  const response = await api.put(`/admin/invoices/${id}`, data)
  return response.data
}

export const deleteInvoice = async (id) => {
  const response = await api.delete(`/admin/invoices/${id}`)
  return response.data
}

export const markInvoiceAsPaid = async (id, paymentId) => {
  const response = await api.post(`/admin/invoices/${id}/mark-paid`, { payment_id: paymentId })
  return response.data
}

export const cancelInvoice = async (id) => {
  const response = await api.post(`/admin/invoices/${id}/cancel`)
  return response.data
}

export const bulkMatchInvoices = async () => {
  const response = await api.post('/admin/invoices/bulk-match')
  return response.data
}

// Invoice Reports
export const getOutstandingInvoicesReport = async (params = {}) => {
  const response = await api.get('/admin/invoice-reports/outstanding', { params })
  return response.data
}

export const getPaymentCollectionReport = async (params = {}) => {
  const response = await api.get('/admin/invoice-reports/payment-collection', { params })
  return response.data
}

export const getMemberComplianceReport = async (params = {}) => {
  const response = await api.get('/admin/invoice-reports/member-compliance', { params })
  return response.data
}

export const getWeeklySummaryReport = async (params = {}) => {
  const response = await api.get('/admin/invoice-reports/weekly-summary', { params })
  return response.data
}

export const getMembersWithInvoices = async (params = {}) => {
  const response = await api.get('/admin/invoices/members-summary', { params })
  return response.data
}

export const getInvoiceTypes = async (activeOnly = false) => {
  const response = await api.get('/admin/invoice-types', { params: { active_only: activeOnly } })
  return response.data
}

