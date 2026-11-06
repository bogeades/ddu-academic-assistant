import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Session load error', e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
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

    await AsyncStorage.setItem('userToken', receivedToken);
    await AsyncStorage.setItem('userData', JSON.stringify(receivedUser));

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

    await AsyncStorage.setItem('userToken', receivedToken);
    await AsyncStorage.setItem('userData', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const verifyOTP = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    const { token: receivedToken, user: receivedUser } = res.data;

    await AsyncStorage.setItem('userToken', receivedToken);
    await AsyncStorage.setItem('userData', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const resendOTP = async (email) => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, role: user?.role, login, verifyOTP, firstTimeSetup, resendOTP, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
