import axios from 'axios';
import { useToastStore } from '../store/toastStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bridgeup_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Action could not be completed.';
    if (error.response?.status === 401) {
      localStorage.removeItem('bridgeup_token');
      localStorage.removeItem('bridgeup_user');
      if (!['/login', '/signup', '/landing', '/'].includes(window.location.pathname)) {
        window.location.replace('/login');
      }
    }
    if (!error.config?.silent) {
      useToastStore.getState().showToast(message, 'error');
    }
    return Promise.reject(error);
  }
);
