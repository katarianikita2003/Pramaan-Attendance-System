import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'scholar';
  organizationId?: string;
  scholarId?: string;
}

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (type: 'admin' | 'scholar', credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedOrg = await AsyncStorage.getItem('organization');
      const token = await AsyncStorage.getItem('authToken');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        if (storedOrg) {
          setOrganization(JSON.parse(storedOrg));
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (type: 'admin' | 'scholar', credentials: any) => {
    try {
      let response;
      
      if (type === 'admin') {
        response = await api.adminLogin(credentials.email, credentials.password);
      } else {
        response = await api.scholarLogin(
          credentials.scholarId,
          credentials.organizationCode,
          credentials.biometricData
        );
      }

      const userData: User = {
        id: response.admin?.id || response.scholar?.id,
        name: response.admin?.name || response.scholar?.name,
        email: response.admin?.email || response.scholar?.email,
        role: type,
        organizationId: response.organization?.id,
        scholarId: response.scholar?.scholarId
      };

      setUser(userData);
      setOrganization(response.organization);

      // Store auth data
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('organization', JSON.stringify(response.organization));
      await AsyncStorage.setItem('authToken', response.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      await AsyncStorage.multiRemove(['user', 'organization', 'authToken']);
      setUser(null);
      setOrganization(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    organization,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};