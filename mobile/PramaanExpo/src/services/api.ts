// mobile/PramaanExpo/src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS, TIMEOUTS } from '../config/constants';

// Create axios instance with enhanced configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.DEFAULT,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  // Prevent automatic transformation that might cause issues
  transformRequest: [(data, headers) => {
    // For FormData, let axios handle it
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      return data;
    }
    
    // For strings, check if they're already JSON
    if (typeof data === 'string') {
      try {
        // Try to parse to see if it's valid JSON
        JSON.parse(data);
        return data;
      } catch {
        // Not JSON, stringify it
        return JSON.stringify(data);
      }
    }
    
    // For objects, stringify them
    if (data && typeof data === 'object') {
      return JSON.stringify(data);
    }
    
    return data;
  }],
  transformResponse: [(data) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }],
});

// Request interceptor with enhanced debugging
api.interceptors.request.use(
  async (config) => {
    try {
      // Get auth token
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Enhanced debug logging
      if (__DEV__) {
        console.log('=== API REQUEST ===');
        console.log('Method:', config.method?.toUpperCase());
        console.log('URL:', config.url);
        console.log('Full URL:', `${config.baseURL}${config.url}`);
        console.log('Has Token:', !!token);
        
        if (config.data) {
          console.log('Data Type:', typeof config.data);
          if (typeof config.data === 'string') {
            console.log('String Data:', config.data.substring(0, 100) + '...');
          } else if (config.data instanceof FormData) {
            console.log('FormData:', 'FormData object');
          } else {
            console.log('Object Data:', config.data);
          }
        }
        
        console.log('Headers:', {
          'Content-Type': config.headers['Content-Type'],
          'Authorization': config.headers.Authorization ? 'Bearer ***' : 'None'
        });
        console.log('==================');
      }

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Request setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('=== API RESPONSE ===');
      console.log('Status:', response.status);
      console.log('URL:', response.config.url);
      console.log('Data:', response.data);
      console.log('===================');
    }
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      console.error('=== API ERROR ===');
      console.error('URL:', error.config?.url);
      console.error('Method:', error.config?.method);
      console.error('Status:', error.response?.status);
      console.error('Response:', error.response?.data);
      console.error('Message:', error.message);
      console.error('=================');
    }

    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle authentication errors
      if (status === 401) {
        // Clear stored auth data
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.USER_TYPE,
          STORAGE_KEYS.ORGANIZATION_CODE,
        ]);
      }
      
      // Format error message
      const errorMessage = 
        (data as any)?.error || 
        (data as any)?.message || 
        error.message || 
        'An error occurred';
      
      // Enhance error object
      error.message = errorMessage;
    } else if (error.request) {
      // Request made but no response
      error.message = 'No response from server. Please check your connection.';
    } else {
      // Request setup error
      error.message = error.message || 'Request failed';
    }

    return Promise.reject(error);
  }
);

// Type definitions
interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: any;
  admin?: any;
  scholar?: any;
  organization?: any;
  organizationCode?: string;
  error?: string;
  message?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth services with enhanced error handling
export const authService = {
  async registerOrganization(data: any): Promise<any> {
    try {
      console.log('Registering organization...');
      const response = await api.post(API_ENDPOINTS.REGISTER_ORGANIZATION, data);
      
      if (response.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'admin');
        
        if (response.data.organizationCode) {
          await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, response.data.organizationCode);
        }
      }
      
      return { ...response.data, success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async adminLogin(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Admin login attempt for:', email);
      
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Prepare login data
      const loginData = {
        email: String(email).trim().toLowerCase(),
        password: String(password).trim()
      };
      
      console.log('Sending login request...');
      const response = await api.post(API_ENDPOINTS.ADMIN_LOGIN, loginData);
      
      console.log('Login response received');
      
      if (response.data.token) {
        // Store authentication data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        
        const userData = response.data.user || response.data.admin;
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'admin');
        
        if (response.data.organization) {
          await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, response.data.organization.code);
        }
        
        console.log('Login successful, auth data stored');
      }
      
      return { ...response.data, success: true };
    } catch (error: any) {
      console.error('Admin login error:', error.message);
      throw error;
    }
  },

  async scholarLogin(email: string, password: string, organizationCode: string): Promise<LoginResponse> {
    try {
      console.log('Scholar login attempt for:', email);
      
      // Validate inputs
      if (!email || !password || !organizationCode) {
        throw new Error('Email, password, and organization code are required');
      }
      
      const loginData = {
        email: String(email).trim().toLowerCase(),
        password: String(password).trim(),
        organizationCode: String(organizationCode).trim().toUpperCase()
      };
      
      const response = await api.post(API_ENDPOINTS.SCHOLAR_LOGIN, loginData);
      
      if (response.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        
        const userData = response.data.user || response.data.scholar;
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TYPE, 'scholar');
        await AsyncStorage.setItem(STORAGE_KEYS.ORGANIZATION_CODE, organizationCode);
      }
      
      return { ...response.data, success: true };
    } catch (error: any) {
      console.error('Scholar login error:', error.message);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      console.log('Logging out...');
      
      // Clear all stored data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_TYPE,
        STORAGE_KEYS.ORGANIZATION_CODE,
        STORAGE_KEYS.BIOMETRIC_ENROLLED,
      ]);
      
      console.log('Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear on error
      await AsyncStorage.clear();
    }
  },

  async forgotPassword(email: string, userType: 'admin' | 'scholar'): Promise<ApiResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, { 
        email: email.trim().toLowerCase(), 
        userType 
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async resetPassword(token: string, newPassword: string, userType: 'admin' | 'scholar'): Promise<ApiResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, { 
        token, 
        newPassword,
        userType 
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

// Admin services - COMPLETE VERSION
export const adminService = {
  async getDashboard(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_DASHBOARD);
      return response.data;
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  },

  async getDashboardData(): Promise<any> {
    // Alias for getDashboard for backward compatibility
    return this.getDashboard();
  },

  async getAnalytics(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_ANALYTICS);
      return response.data;
    } catch (error) {
      console.error('Get analytics error:', error);
      // Return default data if endpoint is not available
      return {
        success: true,
        analytics: {
          monthlyAttendance: [],
          departmentWise: [],
          trends: []
        }
      };
    }
  },

  async getScholars(page = 1, limit = 20, search = ''): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_SCHOLARS, {
        params: { page, limit, search: search.trim() }
      });
      return response.data;
    } catch (error) {
      console.error('Get scholars error:', error);
      throw error;
    }
  },

  async addScholar(scholarData: any): Promise<any> {
    try {
      // Get current user data for organizationId
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const user = userData ? JSON.parse(userData) : null;
      
      const requestData = {
        ...scholarData,
        organizationId: scholarData.organizationId || user?.organizationId
      };

      const response = await api.post(API_ENDPOINTS.SCHOLAR_REGISTER, requestData);
      return response.data;
    } catch (error) {
      console.error('Add scholar error:', error);
      throw error;
    }
  },

  async registerScholar(scholarData: any): Promise<any> {
    try {
      // Get current user data for organizationId
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const user = userData ? JSON.parse(userData) : null;
      
      // If profile image is a local URI, prepare for upload
      if (scholarData.personalInfo.profileImage && 
          scholarData.personalInfo.profileImage.startsWith('file://')) {
        
        // Create FormData for file upload
        const formData = new FormData();
        
        // Add profile image
        const photoUri = scholarData.personalInfo.profileImage;
        const photoName = photoUri.split('/').pop();
        const photoType = `image/${photoName.split('.').pop()}`;
        
        formData.append('profileImage', {
          uri: photoUri,
          name: photoName,
          type: photoType,
        } as any);
        
        // Add other data as JSON strings
        formData.append('scholarId', scholarData.scholarId);
        formData.append('password', scholarData.password);
        formData.append('organizationId', scholarData.organizationId || user?.organizationId);
        formData.append('personalInfo', JSON.stringify({
          name: scholarData.personalInfo.name,
          email: scholarData.personalInfo.email,
          phone: scholarData.personalInfo.phone,
        }));
        formData.append('academicInfo', JSON.stringify(scholarData.academicInfo));
        
        if (scholarData.biometrics) {
          formData.append('biometrics', JSON.stringify(scholarData.biometrics));
        }
        
        const response = await api.post(API_ENDPOINTS.SCHOLAR_REGISTER, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: (data) => data, // Prevent axios from stringifying FormData
        });
        
        return response.data;
      } else {
        // No file upload, send as JSON
        const requestData = {
          ...scholarData,
          organizationId: scholarData.organizationId || user?.organizationId
        };
        
        const response = await api.post(API_ENDPOINTS.SCHOLAR_REGISTER, requestData);
        return response.data;
      }
    } catch (error) {
      console.error('Register scholar error:', error);
      throw error;
    }
  },

  async updateScholar(scholarId: string, updateData: any): Promise<any> {
    try {
      const response = await api.put(`${API_ENDPOINTS.ADMIN_SCHOLARS}/${scholarId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Update scholar error:', error);
      throw error;
    }
  },

  async deleteScholar(scholarId: string): Promise<any> {
    try {
      const response = await api.delete(`${API_ENDPOINTS.ADMIN_SCHOLARS}/${scholarId}`);
      return response.data;
    } catch (error) {
      console.error('Delete scholar error:', error);
      throw error;
    }
  },

  async getReports(dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_REPORTS, {
        params: dateRange ? {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('Get reports error:', error);
      throw error;
    }
  },

  async getAttendanceReport(filters?: any): Promise<any> {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN_REPORTS}/attendance`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Get attendance report error:', error);
      throw error;
    }
  },

  async exportReport(type: string, format: 'pdf' | 'csv', filters?: any): Promise<any> {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN_REPORTS}/export`, {
        params: { type, format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Export report error:', error);
      throw error;
    }
  },

  async getStats(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_STATS);
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  },

  async searchScholars(query: string): Promise<any> {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN_SCHOLARS}/search`, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Search scholars error:', error);
      throw error;
    }
  },

  async getBulkUploadTemplate(): Promise<any> {
    try {
      const response = await api.get(`${API_ENDPOINTS.ADMIN_SCHOLARS}/template`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Get template error:', error);
      throw error;
    }
  },

  async bulkUploadScholars(file: any): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`${API_ENDPOINTS.ADMIN_SCHOLARS}/bulk`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  },
};

// Scholar services
export const scholarService = {
  async register(scholarData: any): Promise<any> {
    try {
      const response = await api.post('/scholar/self-register', scholarData);
      return response.data;
    } catch (error) {
      console.error('Scholar registration error:', error);
      throw error;
    }
  },

  async login(email: string, password: string, organizationCode: string): Promise<any> {
    try {
      const response = await api.post(API_ENDPOINTS.SCHOLAR_LOGIN, {
        email,
        password,
        organizationCode
      });
      return response.data;
    } catch (error) {
      console.error('Scholar login error:', error);
      throw error;
    }
  },

  async getProfile(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.SCHOLAR_PROFILE);
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  async updateProfile(profileData: any): Promise<any> {
    try {
      const response = await api.put(API_ENDPOINTS.SCHOLAR_PROFILE, profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<any> {
    try {
      const response = await api.post(`${API_ENDPOINTS.SCHOLAR_PROFILE}/change-password`, passwordData);
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  async getStats(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.SCHOLAR_STATS);
      return response.data;
    } catch (error) {
      console.error('Get scholar stats error:', error);
      throw error;
    }
  },

  async getAttendanceHistory(filters?: any): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.SCHOLAR_ATTENDANCE_HISTORY, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Get attendance history error:', error);
      throw error;
    }
  },
};

// Organization services
export const organizationService = {
  async getDetails(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ORGANIZATION_DETAILS);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateSettings(settings: any): Promise<any> {
    try {
      const response = await api.put(API_ENDPOINTS.ORGANIZATION_SETTINGS, settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getBoundaries(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ORGANIZATION_BOUNDARIES);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateBoundaries(boundaries: any): Promise<any> {
    try {
      const response = await api.put(API_ENDPOINTS.ORGANIZATION_BOUNDARIES, boundaries);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getStats(): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ORGANIZATION_STATS);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getOrganizationByCode(code: string): Promise<any> {
    try {
      const response = await api.get(`${API_ENDPOINTS.ORGANIZATION_DETAILS}/code/${code}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Attendance services
export const attendanceService = {
  async markAttendance(attendanceData: any): Promise<any> {
    try {
      const response = await api.post(API_ENDPOINTS.MARK_ATTENDANCE, attendanceData);
      return response.data;
    } catch (error) {
      console.error('Mark attendance error:', error);
      throw error;
    }
  },

  async verifyProof(proofData: string): Promise<any> {
    try {
      const response = await api.post(API_ENDPOINTS.VERIFY_PROOF, { 
        proof: proofData 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAttendanceStats(period?: string): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ATTENDANCE_STATS, {
        params: period ? { period } : {}
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getHistory(filters?: any): Promise<any> {
    try {
      const response = await api.get(API_ENDPOINTS.ATTENDANCE_HISTORY, {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async generateCertificate(attendanceId: string): Promise<any> {
    try {
      const response = await api.post(API_ENDPOINTS.GENERATE_CERTIFICATE, {
        attendanceId
      });
      return response.data;
    } catch (error) {
      console.error('Generate certificate error:', error);
      throw error;
    }
  },

  async getMonthlyReport(month: number, year: number): Promise<any> {
    try {
      const response = await api.get(`${API_ENDPOINTS.ATTENDANCE_HISTORY}/monthly`, {
        params: { month, year }
      });
      return response.data;
    } catch (error) {
      console.error('Get monthly report error:', error);
      throw error;
    }
  },
};

export default api;