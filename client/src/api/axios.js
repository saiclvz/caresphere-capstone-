import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: import.meta.env.VITE_API_WITH_CREDENTIALS !== 'false',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const csrfToken = document.cookie.split('; ').find((entry) => entry.startsWith('cs_xsrf='))?.split('=')[1];
  if (csrfToken) config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem('cs_token');
    return Promise.reject(error);
  },
);

export default api;
