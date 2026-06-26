import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'https://dsh-result-management-sytem.vercel.app/api';
};

export const BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach authorization tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('huffaz_web_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration/unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user on authentication failure
      localStorage.removeItem('huffaz_web_token');
      localStorage.removeItem('huffaz_web_user');
      // Dispatch custom event to let the app know it needs to log out
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async loginStaff(username: string, password: string) {
    const response = await api.post('/auth/login-staff', { username, password });
    const { token, user } = response.data;
    localStorage.setItem('huffaz_web_token', token);
    localStorage.setItem('huffaz_web_user', JSON.stringify(user));
    return { token, user };
  },

  async loginParent(admissionNumber: string, pin: string) {
    const response = await api.post('/auth/login-parent', { admissionNumber, pin });
    const { token, student } = response.data;
    const parentUser = { ...student, role: 'PARENT' };
    localStorage.setItem('huffaz_web_token', token);
    localStorage.setItem('huffaz_web_user', JSON.stringify(parentUser));
    return { token, user: parentUser };
  },

  logout() {
    localStorage.removeItem('huffaz_web_token');
    localStorage.removeItem('huffaz_web_user');
    window.dispatchEvent(new Event('auth-logout'));
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('huffaz_web_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('huffaz_web_token');
  }
};

export default api;
