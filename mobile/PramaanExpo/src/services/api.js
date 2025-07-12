// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../config/api'; // Import from config file

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Debug logging
      console.log('API Request:', config.method.toUpperCase(), config.url);
      console.log('Full URL:', `${config.baseURL}${config.url}`);

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    // Enhanced error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });

      if (error.response.status === 401) {
        // Handle unauthorized access
        await AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
        // You might want to navigate to login screen here
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Network Error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    } else {
      // Something happened in setting up the request
      console.error('API Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing API connection to:', API_BASE_URL);
    const response = await api.get('/');
    console.log('API connection successful:', response.data);
    return true;
  } catch (error) {
    console.error('API connection failed:', error.message);
    return false;
  }
};

// Auth service
export const authService = {
  async adminLogin(email, password) {
    try {
      // FIXED: Changed from '/auth/admin/login' to '/auth/admin-login'
      const response = await api.post('/auth/admin-login', { email, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async scholarLogin(email, password, organizationCode) {
    try {
      const response = await api.post('/auth/scholar/login', {
        email,
        password,
        organizationCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async logout() {
    try {
      await AsyncStorage.multiRemove([
        'authToken',
        'userData',
        'userType',
        'organizationCode',
      ]);
      console.log('Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
      await AsyncStorage.clear();
    }
  },

  async register(data) {
    try {
      // FIXED: Changed from '/auth/register' to '/auth/register-organization'
      const response = await api.post('/auth/register-organization', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Organization service
export const organizationService = {
  async getDetails() {
    try {
      const response = await api.get('/organization/details');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateSettings(settings) {
    try {
      const response = await api.put('/organization/settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Admin service
export const adminService = {
  async getDashboard() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  },

  async getAnalytics() {
    try {
      const response = await api.get('/admin/analytics');
      return response.data;
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  },

  async getScholars(page = 1, limit = 20, search = '') {
    try {
      const response = await api.get('/admin/scholars', {
        params: { page, limit, search }
      });
      return response.data;
    } catch (error) {
      console.error('Get scholars error:', error);
      throw error;
    }
  },

  async addScholar(scholarData) {
    try {
      // Log what we're sending (excluding sensitive data)
      console.log('Sending scholar data to backend:', {
        scholarId: scholarData.scholarId,
        hasPersonalInfo: !!scholarData.personalInfo,
        hasAcademicInfo: !!scholarData.academicInfo,
        hasBiometrics: !!scholarData.biometrics,
        organizationId: scholarData.organizationId
      });

      // Send the data as-is, with proper biometrics field
      const response = await api.post('/admin/scholars', scholarData);
      return response.data;
    } catch (error) {
      console.error('Add scholar error:', error);
      throw error;
    }
  },

  async getScholarById(id) {
    try {
      const response = await api.get(`/admin/scholars/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get scholar by ID error:', error);
      throw error;
    }
  },

  async updateScholar(id, data) {
    try {
      const response = await api.put(`/admin/scholars/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update scholar error:', error);
      throw error;
    }
  },

  async deleteScholar(id) {
    try {
      const response = await api.delete(`/admin/scholars/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete scholar error:', error);
      throw error;
    }
  },

  async getReports(dateRange) {
    try {
      const params = dateRange ? {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      } : {};

      const response = await api.get('/admin/reports', { params });
      return response.data;
    } catch (error) {
      console.error('Get reports error:', error);
      throw error;
    }
  },

  async getAttendanceReports(filters) {
    try {
      const response = await api.get('/admin/reports/attendance', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Get attendance reports error:', error);
      throw error;
    }
  },

  async getStats() {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  },
};

// Scholar service  
export const scholarService = {
  async getProfile() {
    try {
      const response = await api.get('/scholar/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateProfile(data) {
    try {
      const response = await api.put('/scholar/profile', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getStats() {
    try {
      const response = await api.get('/scholar/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAttendanceHistory(page = 1, limit = 20) {
    try {
      const response = await api.get('/scholar/attendance/history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async markAttendance(data) {
    try {
      const response = await api.post('/attendance/mark', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Attendance service
export const attendanceService = {
  async markAttendance(attendanceData) {
    try {
      const response = await api.post('/attendance/mark', attendanceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getHistory(scholarId, filters = {}) {
    try {
      const response = await api.get(`/attendance/history/${scholarId}`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getStats(scholarId) {
    try {
      const response = await api.get(`/attendance/stats/${scholarId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async verifyCertificate(certificateId) {
    try {
      const response = await api.get(`/attendance/certificate/verify/${certificateId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Biometric service
export const biometricService = {
  async enrollFingerprint(scholarId, fingerprintData) {
    try {
      const response = await api.post('/biometric/enroll/fingerprint', {
        scholarId,
        fingerprintData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async enrollFace(scholarId, faceData) {
    try {
      const response = await api.post('/biometric/enroll/face', {
        scholarId,
        faceData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async verifyBiometric(type, data) {
    try {
      const response = await api.post('/biometric/verify', {
        type,
        data
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Default export
export default api;