import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser({ username: res.data.username, role: res.data.role });
  };

  const register = async (username, password, role = 'user') => {
    const res = await api.post('/auth/register', { username, password, role });
    localStorage.setItem('token', res.data.token);
    setUser({ username: res.data.username, role: res.data.role });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api
      .get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => {
        logout();
        toast.error('Session expirée');
      });
  }, []);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
