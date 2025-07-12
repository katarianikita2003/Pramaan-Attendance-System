// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

// Create the context
export const AuthContext = createContext({});

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
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

      console.log('Checking auth status:', {
        hasToken: !!token,
        hasUserData: !!userData,
        userType: savedUserType
      });

      if (token && userData) {
        const parsedUserData = JSON.parse(userData);
        setUser(parsedUserData);
        setUserType(savedUserType || parsedUserData.userType || 'admin');
        console.log('User authenticated from storage');
      } else {
        console.log('No stored authentication found');
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

      let response;
      if (type === 'admin') {
        response = await authService.adminLogin(email, password);
      } else if (type === 'scholar') {
        response = await authService.scholarLogin(email, password, organizationCode);
      } else {
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

        return { success: true };
      } else {
        const errorMsg = response?.error || response?.message || 'Login failed';
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

// Default export for backwards compatibility
export default AuthContext;