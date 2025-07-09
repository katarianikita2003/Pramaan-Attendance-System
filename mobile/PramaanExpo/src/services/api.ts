// mobile/PramaanExpo/src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS, API_ENDPOINTS, TIMEOUTS } from '../config/constants';

console.log('API Base URL configured as:', API_BASE_URL);

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Enhanced logging with full URL
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log('API Request:', {
        fullUrl,
        url: config.url,
        method: config.method,
        hasToken: !!token,
        baseURL: config.baseURL
      });
      
      return config;
    } catch (error) {
      console.error('Error setting auth token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
    });

    // Handle 401 errors - token might be expired
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      
      if (!isAuthEndpoint) {
        // Clear stored data and redirect to login
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN, 
          STORAGE_KEYS.USER_DATA, 
          STORAGE_KEYS.USER_TYPE
        ]);
      }
    }

    return Promise.reject(error);
  }
);

// Types
interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: any;
  admin?: any;
  scholar?: any;
  organization?: any;
  error?: string;
  message?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth services
export const authService = {
  async registerOrganization(data: any): Promise<any> {
    try {
      const response = await api.post('/auth/register-organization', data);
      
      if (response.data.token) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'admin');
        
        if (response.data.organizationCode) {
          await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, response.data.organizationCode);
        }
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async adminLogin(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/admin-login', { email, password });
      
      if (response.data.token) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        
        // Handle the response structure from the backend
        const userData = response.data.admin || response.data.user;
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'admin');
        
        // Store organization data if available
        if (response.data.organization) {
          await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, response.data.organization.code);
        }
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async scholarLogin(email: string, password: string, organizationCode: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/scholar/login', {
        email,
        password,
        organizationCode,
      });
      
      if (response.data.token) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        
        const userData = response.data.user || response.data.scholar;
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'scholar');
        await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, organizationCode);
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async logout(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN, 
        STORAGE_KEYS.USER_DATA, 
        STORAGE_KEYS.USER_TYPE,
        STORAGE_KEYS.ORGANIZATION_CODE
      ]);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },

  async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
};

// Organization services
export const organizationService = {
  async getDetails(): Promise<ApiResponse> {
    const response = await api.get('/organization/details');
    return response.data;
  },

  async updateSettings(settings: any): Promise<ApiResponse> {
    const response = await api.put('/organization/details', settings);
    return response.data;
  },

  async getBoundaries(): Promise<ApiResponse> {
    const response = await api.get('/organization/boundaries');
    return response.data;
  },

  async getStats(): Promise<ApiResponse> {
    const response = await api.get('/organization/stats');
    return response.data;
  },
};

// Scholar services
export const scholarService = {
  async getStats(): Promise<ApiResponse> {
    const response = await api.get('/scholar/stats');
    return response.data;
  },

  async getProfile(scholarId?: string): Promise<ApiResponse> {
    const endpoint = scholarId ? `/scholar/${scholarId}/profile` : '/scholar/profile';
    const response = await api.get(endpoint);
    return response.data;
  },

  async updateProfile(data: any): Promise<ApiResponse> {
    const response = await api.put('/scholar/profile', data);
    return response.data;
  },

  async getAttendanceHistory(): Promise<ApiResponse> {
    const response = await api.get('/scholar/attendance/history');
    return response.data;
  },

  async enrollBiometric(scholarId: string, type: string, biometricData: any): Promise<ApiResponse> {
    const response = await api.post(`/scholar/${scholarId}/biometric/enroll`, {
      type,
      biometricData
    });
    return response.data;
  },
};

// Attendance services
export const attendanceService = {
  async markAttendance(data: any): Promise<ApiResponse> {
    const response = await api.post('/attendance/mark', data);
    return response.data;
  },

  async generateProof(data: any): Promise<ApiResponse> {
    const response = await api.post('/attendance/generate-proof', data);
    return response.data;
  },

  async verifyProof(proofId: string): Promise<ApiResponse> {
    const response = await api.get(`/attendance/verify/${proofId}`);
    return response.data;
  },

  async getRecords(filters = {}): Promise<ApiResponse> {
    const response = await api.get('/attendance/records', { params: filters });
    return response.data;
  },
  
  async getHistory(scholarId?: string, params = {}): Promise<ApiResponse> {
    const endpoint = scholarId 
      ? `/attendance/history/${scholarId}` 
      : '/attendance/history';
    const response = await api.get(endpoint, { params });
    return response.data;
  },

  async getStats(scholarId: string): Promise<ApiResponse> {
    const response = await api.get(`/attendance/stats/${scholarId}`);
    return response.data;
  },

  async generateCertificate(scholarId: string, period: any): Promise<ApiResponse> {
    const response = await api.post('/attendance/certificate', {
      scholarId,
      period
    });
    return response.data;
  },
};

// Admin services
export const adminService = {
  async getDashboard(): Promise<ApiResponse> {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  async getScholars(params = {}): Promise<ApiResponse> {
    const response = await api.get('/admin/scholars', { params });
    return response.data;
  },

  async addScholar(scholarData: any): Promise<ApiResponse> {
    const response = await api.post('/scholar/register', scholarData);
    return response.data;
  },

  async updateScholar(scholarId: string, data: any): Promise<ApiResponse> {
    const response = await api.put(`/scholar/${scholarId}`, data);
    return response.data;
  },

  async deleteScholar(scholarId: string): Promise<ApiResponse> {
    const response = await api.delete(`/scholar/${scholarId}`);
    return response.data;
  },

  async getAttendanceReports(params = {}): Promise<ApiResponse> {
    const response = await api.get('/admin/reports', { params });
    return response.data;
  },

  async getStats(): Promise<ApiResponse> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  async getAnalytics(params = {}): Promise<ApiResponse> {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },
};

export default api;