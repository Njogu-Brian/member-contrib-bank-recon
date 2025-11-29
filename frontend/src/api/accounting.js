import api from './axios'

export const createJournalEntry = async (payload) => {
  const { data } = await api.post('/admin/accounting/journal-entries', payload)
  return data
}

export const postJournalEntry = async (entryId) => {
  const { data } = await api.post(`/admin/accounting/journal-entries/${entryId}/post`)
  return data
}

export const getGeneralLedger = async (params = {}) => {
  const { data } = await api.get('/admin/accounting/general-ledger', { params })
  return data
}

export const getTrialBalance = async (params = {}) => {
  const { data } = await api.get('/admin/accounting/trial-balance', { params })
  return data
}

export const getProfitAndLoss = async (params = {}) => {
  const { data } = await api.get('/admin/accounting/profit-loss', { params })
  return data
}

export const getCashFlow = async (params = {}) => {
  const { data } = await api.get('/admin/accounting/cash-flow', { params })
  return data
}

export const getAccountingPeriods = async () => {
  const { data } = await api.get('/admin/accounting/periods')
  return data
}

export const getChartOfAccounts = async (params = {}) => {
  const { data } = await api.get('/admin/accounting/chart-of-accounts', { params })
  return data
}

