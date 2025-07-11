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

      console.log('AuthContext: Starting login for type:', type);
      console.log('AuthContext: Parameters:', {
        email: email,
        passwordLength: password?.length,
        organizationCode: organizationCode,
        type: type
      });

      let response;
      if (type === 'admin') {
        console.log('AuthContext: Calling adminLogin');
        response = await authService.adminLogin(email, password);
      } else if (type === 'scholar') {
        console.log('AuthContext: Calling scholarLogin');
        response = await authService.scholarLogin(email, password, organizationCode);
      } else {
        console.error('AuthContext: Invalid user type:', type);
        throw new Error('Invalid user type');
      }

      console.log('AuthContext: Login response:', response);

      if (response && (response.success || response.token)) {
        // Store auth data
        if (response.token) {
          await AsyncStorage.setItem('authToken', response.token);
        }
        
        const userData = response.user || response.admin || response.scholar;
        if (userData) {
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          await AsyncStorage.setItem('userType', userData.userType || type);
          
          setUser(userData);
          setUserType(userData.userType || type);
        }

        console.log('AuthContext: Auth data saved, updating state');
        console.log('AuthContext: Login successful, isAuthenticated:', !!userData);

        return { success: true };
      } else {
        const errorMsg = response?.error || response?.message || 'Login failed';
        console.log('AuthContext: Login failed:', errorMsg);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove([
        'authToken',
        'userData',
        'userType',
        'organizationCode'
      ]);
      
      // Clear state
      setUser(null);
      setUserType(null);
      setError(null);
      
      console.log('AuthContext: Logout successful');
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