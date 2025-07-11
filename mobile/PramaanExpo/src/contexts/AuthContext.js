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

      console.log('Checking auth status:', {
        hasToken: !!token,
        hasUserData: !!userData,
        userType: savedUserType
      });

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setUserType(savedUserType);
          console.log('User authenticated from storage');
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          // Clear corrupted data
          await AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
        }
      } else {
        console.log('User is not authenticated');
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

      console.log('Login attempt:', {
        email,
        passwordLength: password?.length,
        userType: type,
        hasOrgCode: organizationCode ? 'Yes' : 'N/A'
      });

      let response;
      
      if (type === 'admin') {
        response = await authService.adminLogin(email, password);
      } else if (type === 'scholar') {
        if (!organizationCode) {
          throw new Error('Organization code is required for scholar login');
        }
        response = await authService.scholarLogin(email, password, organizationCode);
      } else {
        throw new Error('Invalid user type');
      }

      console.log('Login response:', response);

      if (response && response.success) {
        // Extract user data from response
        const userData = response.user || response.admin || response.scholar;
        
        if (!userData) {
          throw new Error('No user data in response');
        }

        // Ensure userType is set properly
        const finalUserType = userData.userType || userData.role || type;
        userData.userType = finalUserType;

        console.log('Login successful, user type:', finalUserType);

        // Store auth data - only store defined values
        const storagePromises = [];
        
        if (response.token) {
          storagePromises.push(AsyncStorage.setItem('authToken', response.token));
        }
        
        storagePromises.push(AsyncStorage.setItem('userData', JSON.stringify(userData)));
        storagePromises.push(AsyncStorage.setItem('userType', finalUserType));
        
        if (organizationCode) {
          storagePromises.push(AsyncStorage.setItem('organizationCode', organizationCode));
        } else if (response.organization?.code) {
          storagePromises.push(AsyncStorage.setItem('organizationCode', response.organization.code));
        }

        await Promise.all(storagePromises);

        // Update state
        setUser(userData);
        setUserType(finalUserType);
        
        console.log('User data stored:', userData);
        console.log('Login successful');
        
        return { success: true };
      } else {
        const errorMsg = response?.error || response?.message || 'Login failed';
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('Login error:', error);
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
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData) => {
    try {
      if (!userData) {
        console.error('Cannot update user with null/undefined data');
        return;
      }
      
      setUser(userData);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      console.log('User data updated');
    } catch (error) {
      console.error('Error updating user:', error);
    }
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