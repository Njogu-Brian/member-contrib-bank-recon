import api from './axios';

export const manualContributionsApi = {
  list: (params) => api.get('/manual-contributions', { params }).then((res) => res.data),
  get: (id) => api.get(`/manual-contributions/${id}`).then((res) => res.data),
  create: (data) => api.post('/manual-contributions', data).then((res) => res.data),
  update: (id, data) => api.put(`/manual-contributions/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/manual-contributions/${id}`).then((res) => res.data),
};

