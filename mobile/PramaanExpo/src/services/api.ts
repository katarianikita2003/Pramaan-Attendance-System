// mobile/PramaanExpo/src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS, API_ENDPOINTS, TIMEOUTS } from '../config/constants';

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
      
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
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
    if (error.response?.status === 401 && 
        error.config?.url !== API_ENDPOINTS.ADMIN_LOGIN && 
        error.config?.url !== API_ENDPOINTS.SCHOLAR_LOGIN) {
      // Clear stored data and redirect to login
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN, 
        STORAGE_KEYS.USER_DATA, 
        STORAGE_KEYS.USER_TYPE
      ]);
    }

    return Promise.reject(error);
  }
);

// Types
interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
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
      
      if (response.data.success && response.data.token) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'admin');
        await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, response.data.organizationCode);
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async adminLogin(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.ADMIN_LOGIN, { email, password });
      
      if (response.data.success && response.data.token) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'admin');
      }
      
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async scholarLogin(email: string, password: string, organizationCode: string): Promise<LoginResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.SCHOLAR_LOGIN, {
        email,
        password,
        organizationCode,
      });
      
      if (response.data.success && response.data.token) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
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
    const response = await api.get(API_ENDPOINTS.ORGANIZATION_DETAILS);
    return response.data;
  },

  async updateSettings(settings: any): Promise<ApiResponse> {
    const response = await api.put(API_ENDPOINTS.ORGANIZATION_SETTINGS, settings);
    return response.data;
  },

  async getBoundaries(): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.ORGANIZATION_BOUNDARIES);
    return response.data;
  },
};

// Scholar services
export const scholarService = {
  async getStats(): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.SCHOLAR_STATS);
    return response.data;
  },

  async getProfile(): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.SCHOLAR_PROFILE);
    return response.data;
  },

  async updateProfile(data: any): Promise<ApiResponse> {
    const response = await api.put(API_ENDPOINTS.SCHOLAR_PROFILE, data);
    return response.data;
  },

  async getAttendanceHistory(): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.SCHOLAR_ATTENDANCE_HISTORY);
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
  
  async getHistory(params = {}): Promise<ApiResponse> {
    const response = await api.get('/attendance/history', { params });
    return response.data;
  },
};

// Admin services
export const adminService = {
  async getDashboard(): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.ADMIN_DASHBOARD);
    return response.data;
  },

  async getScholars(): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.ADMIN_SCHOLARS);
    return response.data;
  },

  async addScholar(scholarData: any): Promise<ApiResponse> {
    const response = await api.post(API_ENDPOINTS.ADMIN_SCHOLARS, scholarData);
    return response.data;
  },

  async updateScholar(scholarId: string, data: any): Promise<ApiResponse> {
    const response = await api.put(`${API_ENDPOINTS.ADMIN_SCHOLARS}/${scholarId}`, data);
    return response.data;
  },

  async deleteScholar(scholarId: string): Promise<ApiResponse> {
    const response = await api.delete(`${API_ENDPOINTS.ADMIN_SCHOLARS}/${scholarId}`);
    return response.data;
  },

  async getAttendanceReports(filters = {}): Promise<ApiResponse> {
    const response = await api.get(API_ENDPOINTS.ADMIN_REPORTS, { params: filters });
    return response.data;
  },
};

export default api;