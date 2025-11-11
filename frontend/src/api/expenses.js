import api from './axios';

export const expensesApi = {
  list: (params) => api.get('/expenses', { params }).then((res) => res.data),
  get: (id) => api.get(`/expenses/${id}`).then((res) => res.data),
  create: (data) => api.post('/expenses', data).then((res) => res.data),
  update: (id, data) => api.put(`/expenses/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/expenses/${id}`).then((res) => res.data),
};

