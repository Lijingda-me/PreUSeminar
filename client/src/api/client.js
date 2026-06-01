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
    useToastStore.getState().showToast(message, 'error');
    return Promise.reject(error);
  }
);
