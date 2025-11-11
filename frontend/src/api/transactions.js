import api from './axios';

export const transactionsApi = {
  list: (params) => api.get('/transactions', { params }).then((res) => res.data),
  get: (id) => api.get(`/transactions/${id}`).then((res) => res.data),
  assign: (id, data) => api.post(`/transactions/${id}/assign`, data).then((res) => res.data),
  askAi: (transactionId) => api.post('/transactions/ask-ai', { transaction_id: transactionId }).then((res) => res.data),
};

