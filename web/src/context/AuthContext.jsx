import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [downtimeAlert, setDowntimeAlert] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setToken('');
        }
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for 24h scheduled downtime notice header
    const handleDowntimeNotice = (e) => {
      setDowntimeAlert(e.detail.message);
    };
    window.addEventListener('ddu-downtime-notice', handleDowntimeNotice);

    return () => {
      window.removeEventListener('ddu-downtime-notice', handleDowntimeNotice);
    };
  }, []);

  const login = async (email, password, otp = '') => {
    const res = await api.post('/auth/login', { email, password, otp });
    if (res.data.requirePasswordSetup) {
      return {
        requirePasswordSetup: true,
        requireOtp: true,
        message: res.data.message,
        devOtp: res.data.devOtp,
      };
    }
    if (res.data.requireOtp) {
      return { requireOtp: true, message: res.data.message, devOtp: res.data.devOtp };
    }

    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const firstTimeSetup = async (email, tempPassword, otp, newPassword) => {
    const res = await api.post('/auth/first-time-setup', {
      email,
      tempPassword,
      otp,
      newPassword,
    });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const verifyOTP = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Non-blocking
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken('');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user ? user.role : null,
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        firstTimeSetup,
        verifyOTP,
        register,
        logout,
        downtimeAlert,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
