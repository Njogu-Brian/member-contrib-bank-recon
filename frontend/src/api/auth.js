import api from './axios';

export const authApi = {
  login: (email, password) =>
    api.post('/login', { email, password }).then((res) => {
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      return res.data;
    }),

  register: (name, email, password, password_confirmation) =>
    api.post('/register', { name, email, password, password_confirmation }).then((res) => {
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      return res.data;
    }),

  logout: () => {
    localStorage.removeItem('token');
    return api.post('/logout');
  },

  getUser: () => api.get('/user').then((res) => res.data),
};

