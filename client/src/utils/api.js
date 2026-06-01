// client/src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 300000, // 300s (5 mins) for extremely large AI calls
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cl_token');
      localStorage.removeItem('cl_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
