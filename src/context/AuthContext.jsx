import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario_creditos');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (loginName, clave) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { login: loginName, clave });
      const { token, usuario: user } = res.data;

      localStorage.setItem('token_creditos', token);
      localStorage.setItem('usuario_creditos', JSON.stringify(user));
      setUsuario(user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error || 'Error de autenticación'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token_creditos');
    localStorage.removeItem('usuario_creditos');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);