// ===== mobile/src/contexts/AuthContext.js =====
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api.service';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      const storedOrg = await AsyncStorage.getItem('organization');
      
      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        if (storedOrg) {
          setOrganization(JSON.parse(storedOrg));
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (email, password) => {
    setLoading(true);
    try {
      const response = await apiService.loginAdmin(email, password);
      
      const adminUser = {
        id: response.organization.id,
        role: 'admin',
        email,
        organizationId: response.organization.id
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(adminUser));
      await AsyncStorage.setItem('organization', JSON.stringify(response.organization));
      await AsyncStorage.setItem('userRole', 'admin');
      
      setUser(adminUser);
      setOrganization(response.organization);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginScholar = async (scholarId, organizationCode) => {
    setLoading(true);
    try {
      const response = await apiService.loginScholar(scholarId, organizationCode);
      
      const scholarUser = {
        ...response.scholar,
        role: 'scholar',
        organizationId: response.organization.id
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(scholarUser));
      await AsyncStorage.setItem('organization', JSON.stringify(response.organization));
      await AsyncStorage.setItem('userRole', 'scholar');
      
      setUser(scholarUser);
      setOrganization(response.organization);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiService.logout();
      await AsyncStorage.multiRemove(['user', 'organization', 'userRole', 'authToken']);
      
      setUser(null);
      setOrganization(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    organization,
    loading,
    isAuthenticated,
    loginAdmin,
    loginScholar,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
