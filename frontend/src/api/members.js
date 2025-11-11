import api from './axios';

export const membersApi = {
  list: (params) => api.get('/members', { params }).then((res) => res.data),
  get: (id) => api.get(`/members/${id}`).then((res) => res.data),
  create: (data) => api.post('/members', data).then((res) => res.data),
  update: (id, data) => api.put(`/members/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/members/${id}`).then((res) => res.data),
  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/members/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
};

