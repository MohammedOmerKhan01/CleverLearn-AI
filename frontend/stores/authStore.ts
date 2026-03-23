import { create } from 'zustand';
import api, { setAccessToken } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      setAccessToken(data.accessToken);
      set({ user: data.user, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password });
      setAccessToken(data.accessToken);
      set({ user: data.user, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      set({ user: null, isInitialized: true });
    }
  },

  refreshSession: async () => {
    try {
      const { data } = await api.post('/api/auth/refresh');
      setAccessToken(data.accessToken);
      set({ user: data.user, isInitialized: true });
      return true;
    } catch {
      setAccessToken(null);
      set({ user: null, isInitialized: true });
      return false;
    }
  },
}));
