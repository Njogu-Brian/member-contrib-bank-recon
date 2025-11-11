import api from './axios';

export const statementsApi = {
  list: (params) => api.get('/statements', { params }).then((res) => res.data),
  get: (id) => api.get(`/statements/${id}`).then((res) => res.data),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
  delete: (id) => api.delete(`/statements/${id}`).then((res) => res.data),
};

