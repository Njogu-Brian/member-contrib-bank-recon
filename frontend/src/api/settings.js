import api from './axios';

export const settingsApi = {
  get: () => api.get('/settings').then((res) => res.data),
  update: (data) => api.put('/settings', data).then((res) => res.data),
  getCurrentWeek: () => api.get('/settings/current-week').then((res) => res.data),
};

