// mobile/PramaanExpo/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const [token, userData, savedUserType] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('userType'),
      ]);

      if (token && userData) {
        setUser(JSON.parse(userData));
        setUserType(savedUserType);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, organizationCode = null, type = 'admin') => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (type === 'admin') {
        response = await authService.adminLogin(email, password);
      } else {
        response = await authService.scholarLogin(email, password, organizationCode);
      }

      if (response.success) {
        setUser(response.user);
        setUserType(response.user.userType || type);
        return { success: true };
      } else {
        setError(response.error || 'Login failed');
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setUserType(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    AsyncStorage.setItem('userData', JSON.stringify(userData));
  };

  const value = {
    user,
    userType,
    loading,
    error,
    login,
    logout,
    checkAuthStatus,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: userType === 'admin',
    isScholar: userType === 'scholar',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};