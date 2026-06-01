import { create } from 'zustand';
import { api } from '../api/client';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('bridgeup_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('bridgeup_user');
    localStorage.removeItem('bridgeup_token');
    return null;
  }
}

export const useAuthStore = create((set, get) => ({
  user: readStoredUser(),
  token: localStorage.getItem('bridgeup_token'),
  loading: false,
  error: '',
  async login(email, password) {
    set({ loading: true, error: '' });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('bridgeup_token', data.token);
      localStorage.setItem('bridgeup_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return data.user;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Login failed.', loading: false });
      throw error;
    }
  },
  async register(payload) {
    set({ loading: true, error: '' });
    try {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('bridgeup_token', data.token);
      localStorage.setItem('bridgeup_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return data.user;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed.', loading: false });
      throw error;
    }
  },
  async refreshMe() {
    if (!get().token) return null;
    const { data } = await api.get('/auth/me');
    localStorage.setItem('bridgeup_user', JSON.stringify(data.user));
    set({ user: data.user });
    return data.user;
  },
  setUser(user) {
    localStorage.setItem('bridgeup_user', JSON.stringify(user));
    set({ user });
  },
  logout() {
    localStorage.removeItem('bridgeup_token');
    localStorage.removeItem('bridgeup_user');
    set({ user: null, token: null });
  }
}));
