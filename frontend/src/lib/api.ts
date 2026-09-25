import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:4000/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Tunnel-Skip-Anti-Phishing-Page': 'true',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    config.headers['X-Tunnel-Skip-Anti-Phishing-Page'] = 'true';
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle 401 Unauthorized (session revoked)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthRoute = window.location.pathname.startsWith('/login') ||
                          window.location.pathname.startsWith('/forgot-password');
      if (!isAuthRoute) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login?error=session_expired';
      }
    }
    return Promise.reject(error);
  },
);
