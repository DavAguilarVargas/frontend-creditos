import axios from 'axios';

// URL base de la API REST desplegada en Render
const API_URL = import.meta.env.VITE_API_URL || 'https://backend-creditos.onrender.com/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token_creditos');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejo de sesiones expiradas (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token_creditos');
      localStorage.removeItem('usuario_creditos');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);