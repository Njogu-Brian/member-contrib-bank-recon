import api from './axios';

export const transactionsApi = {
  list: (params) => api.get('/transactions', { params }).then((res) => res.data),
  get: (id) => api.get(`/transactions/${id}`).then((res) => res.data),
  assign: (id, data) => api.post(`/transactions/${id}/assign`, data).then((res) => res.data),
  split: (id, data) => api.post(`/transactions/${id}/split`, data).then((res) => res.data),
  autoAssign: (params) => api.post('/transactions/auto-assign', params).then((res) => res.data),
  bulkAssign: (assignments) => api.post('/transactions/bulk-assign', { assignments }).then((res) => res.data),
  askAi: (transactionId) => api.post('/transactions/ask-ai', { transaction_id: transactionId }).then((res) => res.data),
};

