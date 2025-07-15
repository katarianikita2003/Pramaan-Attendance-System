// mobile/PramaanExpo/src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// API Base URL - Update this with your backend server IP
const API_BASE_URL = Platform.select({
  ios: 'http://localhost:5000/api',
  android: 'http://10.13.117.32:5000/api', // Your IP from the logs
  default: 'http://localhost:5000/api',
});

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - CRITICAL FIX FOR AUTH
api.interceptors.request.use(
  async (config) => {
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      
      if (token) {
        // Add Authorization header with Bearer token
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Debug logging
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`Full URL: ${config.baseURL}${config.url}`);
      
      // Log auth header presence for debugging
      if (config.headers.Authorization) {
        console.log('Auth header present:', config.headers.Authorization.substring(0, 20) + '...');
      } else {
        console.log('No auth header in request');
      }

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
    console.log(`API Response: ${response.config.url} ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      console.error('API Error Response:', {
        url: error.response.config.url,
        status: error.response.status,
        data: error.response.data,
      });

      // Handle 401 errors (but not for login endpoints)
      if (error.response.status === 401 && !originalRequest.url.includes('/auth/')) {
        // Clear auth data
        await AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
        // You might want to navigate to login screen here
        // Navigation.navigate('Login');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Network error - check if backend is running and accessible');
    } else {
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing API connection to:', API_BASE_URL);
    const response = await api.get('/health'); // Assuming you have a health check endpoint
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
      console.log('Registering organization with data:', {
        hasOrganization: !!data.organization,
        hasAdmin: !!data.admin,
        hasBoundaries: !!data.boundaries
      });
      
      const response = await api.post('/auth/register-organization', data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  async registerOrganization(data) {
    return this.register(data);
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
      console.log('Sending scholar data to backend:', {
        scholarId: scholarData.scholarId,
        hasPersonalInfo: !!scholarData.personalInfo,
        hasAcademicInfo: !!scholarData.academicInfo,
        hasBiometrics: !!scholarData.biometrics,
      });

      const response = await api.post('/admin/scholars', scholarData);
      return response.data;
    } catch (error) {
      console.error('Add scholar error:', error);
      throw error;
    }
  },

  async registerScholar(scholarData) {
    return this.addScholar(scholarData);
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

// NEW: Enhanced Attendance service with ZKP support
export const attendanceService = {
  // Generate attendance proof and QR code
  async generateProof(biometricData, location) {
    try {
      const response = await api.post('/attendance/generate-proof', {
        biometricData,
        location,
        deviceInfo: {
          platform: Platform.OS,
          model: 'expo-client'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify QR code (for admins)
  async verifyQR(qrData) {
    try {
      const response = await api.post('/attendance/verify-qr', {
        qrData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get pending verifications (for admins)
  async getPendingVerifications() {
    try {
      const response = await api.get('/attendance/pending-verifications');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance history with verification status
  async getHistory(params = {}) {
    try {
      const response = await api.get('/attendance/history', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Legacy markAttendance (deprecated)
  async markAttendance(scholarId, biometricProof) {
    try {
      // This endpoint is deprecated, use generateProof instead
      const response = await api.post('/attendance/mark', {
        scholarId,
        biometricProof,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTodayAttendance() {
    try {
      const response = await api.get('/attendance/today');
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

// Biometric service exports
export const biometricService = {
  async enroll(formData) {
    try {
      const response = await api.post('/biometric/enroll', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async checkEnrollment(scholarId) {
    try {
      const response = await api.get(`/biometric/check-enrollment/${encodeURIComponent(scholarId)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

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

// Export individual functions that RegisterOrganizationScreen expects
export const { register, registerOrganization } = authService;

// Default export
export default api;

// // mobile/PramaanExpo/src/services/api.js
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Alert, Platform } from 'react-native';

// // API Base URL - Update this with your backend server IP
// const API_BASE_URL = Platform.select({
//   ios: 'http://localhost:5000/api',
//   android: 'http://10.13.117.32:5000/api', // Your IP from the logs
//   default: 'http://localhost:5000/api',
// });

// // Create axios instance
// const api = axios.create({
//   baseURL: API_BASE_URL,
//   timeout: 30000,
//   headers: {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json',
//   },
// });

// // Request interceptor - CRITICAL FIX FOR AUTH
// api.interceptors.request.use(
//   async (config) => {
//     try {
//       // Get token from AsyncStorage
//       const token = await AsyncStorage.getItem('authToken');
      
//       if (token) {
//         // Add Authorization header with Bearer token
//         config.headers.Authorization = `Bearer ${token}`;
//       }

//       // Debug logging
//       console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
//       console.log(`Full URL: ${config.baseURL}${config.url}`);
      
//       // Log auth header presence for debugging
//       if (config.headers.Authorization) {
//         console.log('Auth header present:', config.headers.Authorization.substring(0, 20) + '...');
//       } else {
//         console.log('No auth header in request');
//       }

//       return config;
//     } catch (error) {
//       console.error('Request interceptor error:', error);
//       return config;
//     }
//   },
//   (error) => {
//     console.error('Request error:', error);
//     return Promise.reject(error);
//   }
// );

// // Response interceptor
// api.interceptors.response.use(
//   (response) => {
//     console.log(`API Response: ${response.config.url} ${response.status}`);
//     return response;
//   },
//   async (error) => {
//     const originalRequest = error.config;
    
//     if (error.response) {
//       console.error('API Error Response:', {
//         url: error.response.config.url,
//         status: error.response.status,
//         data: error.response.data,
//       });

//       // Handle 401 errors (but not for login endpoints)
//       if (error.response.status === 401 && !originalRequest.url.includes('/auth/')) {
//         // Clear auth data
//         await AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
//         // You might want to navigate to login screen here
//         // Navigation.navigate('Login');
//       }
//     } else if (error.request) {
//       console.error('No response received:', error.request);
//       console.error('Network error - check if backend is running and accessible');
//     } else {
//       console.error('Request setup error:', error.message);
//     }

//     return Promise.reject(error);
//   }
// );

// // Test connection function
// export const testConnection = async () => {
//   try {
//     console.log('Testing API connection to:', API_BASE_URL);
//     const response = await api.get('/health'); // Assuming you have a health check endpoint
//     console.log('API connection successful:', response.data);
//     return true;
//   } catch (error) {
//     console.error('API connection failed:', error.message);
//     return false;
//   }
// };

// // Auth service
// export const authService = {
//   async adminLogin(email, password) {
//     try {
//       const response = await api.post('/auth/admin-login', { email, password });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async scholarLogin(email, password, organizationCode) {
//     try {
//       const response = await api.post('/auth/scholar/login', {
//         email,
//         password,
//         organizationCode
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async logout() {
//     try {
//       await AsyncStorage.multiRemove([
//         'authToken',
//         'userData',
//         'userType',
//         'organizationCode',
//       ]);
//       console.log('Logout complete');
//     } catch (error) {
//       console.error('Logout error:', error);
//       await AsyncStorage.clear();
//     }
//   },

//   async register(data) {
//     try {
//       console.log('Registering organization with data:', {
//         hasOrganization: !!data.organization,
//         hasAdmin: !!data.admin,
//         hasBoundaries: !!data.boundaries
//       });
      
//       const response = await api.post('/auth/register-organization', data);
//       return response.data;
//     } catch (error) {
//       console.error('Registration error:', error.response?.data || error.message);
//       throw error;
//     }
//   },

//   async registerOrganization(data) {
//     return this.register(data);
//   },
// };

// // Organization service
// export const organizationService = {
//   async getDetails() {
//     try {
//       const response = await api.get('/organization/details');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async updateSettings(settings) {
//     try {
//       const response = await api.put('/organization/settings', settings);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },
// };

// // Admin service
// export const adminService = {
//   async getDashboard() {
//     try {
//       const response = await api.get('/admin/dashboard');
//       return response.data;
//     } catch (error) {
//       console.error('Get dashboard error:', error);
//       throw error;
//     }
//   },

//   async getAnalytics() {
//     try {
//       const response = await api.get('/admin/analytics');
//       return response.data;
//     } catch (error) {
//       console.error('Get analytics error:', error);
//       throw error;
//     }
//   },

//   async getScholars(page = 1, limit = 20, search = '') {
//     try {
//       const response = await api.get('/admin/scholars', {
//         params: { page, limit, search }
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Get scholars error:', error);
//       throw error;
//     }
//   },

//   async addScholar(scholarData) {
//     try {
//       console.log('Sending scholar data to backend:', {
//         scholarId: scholarData.scholarId,
//         hasPersonalInfo: !!scholarData.personalInfo,
//         hasAcademicInfo: !!scholarData.academicInfo,
//         hasBiometrics: !!scholarData.biometrics,
//       });

//       const response = await api.post('/admin/scholars', scholarData);
//       return response.data;
//     } catch (error) {
//       console.error('Add scholar error:', error);
//       throw error;
//     }
//   },

//   async registerScholar(scholarData) {
//     return this.addScholar(scholarData);
//   },

//   async getScholarById(id) {
//     try {
//       const response = await api.get(`/admin/scholars/${id}`);
//       return response.data;
//     } catch (error) {
//       console.error('Get scholar by ID error:', error);
//       throw error;
//     }
//   },

//   async updateScholar(id, data) {
//     try {
//       const response = await api.put(`/admin/scholars/${id}`, data);
//       return response.data;
//     } catch (error) {
//       console.error('Update scholar error:', error);
//       throw error;
//     }
//   },

//   async deleteScholar(id) {
//     try {
//       const response = await api.delete(`/admin/scholars/${id}`);
//       return response.data;
//     } catch (error) {
//       console.error('Delete scholar error:', error);
//       throw error;
//     }
//   },

//   async getReports(dateRange) {
//     try {
//       const params = dateRange ? {
//         startDate: dateRange.start.toISOString(),
//         endDate: dateRange.end.toISOString()
//       } : {};

//       const response = await api.get('/admin/reports', { params });
//       return response.data;
//     } catch (error) {
//       console.error('Get reports error:', error);
//       throw error;
//     }
//   },

//   async getAttendanceReports(filters) {
//     try {
//       const response = await api.get('/admin/reports/attendance', {
//         params: filters
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Get attendance reports error:', error);
//       throw error;
//     }
//   },

//   async getStats() {
//     try {
//       const response = await api.get('/admin/stats');
//       return response.data;
//     } catch (error) {
//       console.error('Get stats error:', error);
//       throw error;
//     }
//   },
// };

// // Scholar service  
// export const scholarService = {
//   async getProfile() {
//     try {
//       const response = await api.get('/scholar/profile');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async updateProfile(data) {
//     try {
//       const response = await api.put('/scholar/profile', data);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async getStats() {
//     try {
//       const response = await api.get('/scholar/stats');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async getAttendanceHistory(page = 1, limit = 20) {
//     try {
//       const response = await api.get('/scholar/attendance/history', {
//         params: { page, limit }
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async markAttendance(data) {
//     try {
//       const response = await api.post('/attendance/mark', data);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },
// };

// // Attendance service - For direct attendance operations
// export const attendanceService = {
//   async markAttendance(scholarId, biometricProof) {
//     try {
//       // Note: We'll use this from the separate attendanceService.js file
//       // This is just for compatibility
//       const response = await api.post('/attendance/mark', {
//         scholarId,
//         biometricProof,
//         timestamp: new Date().toISOString(),
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async getTodayAttendance() {
//     try {
//       const response = await api.get('/attendance/today');
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async getHistory(scholarId, filters = {}) {
//     try {
//       const response = await api.get(`/attendance/history/${scholarId}`, {
//         params: filters
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async getStats(scholarId) {
//     try {
//       const response = await api.get(`/attendance/stats/${scholarId}`);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async verifyCertificate(certificateId) {
//     try {
//       const response = await api.get(`/attendance/certificate/verify/${certificateId}`);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },
// };

// // Biometric service exports
// export const biometricService = {
//   async enroll(formData) {
//     try {
//       const response = await api.post('/biometric/enroll', formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async checkEnrollment(scholarId) {
//     try {
//       const response = await api.get(`/biometric/check-enrollment/${encodeURIComponent(scholarId)}`);
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async enrollFingerprint(scholarId, fingerprintData) {
//     try {
//       const response = await api.post('/biometric/enroll/fingerprint', {
//         scholarId,
//         fingerprintData
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async enrollFace(scholarId, faceData) {
//     try {
//       const response = await api.post('/biometric/enroll/face', {
//         scholarId,
//         faceData
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },

//   async verifyBiometric(type, data) {
//     try {
//       const response = await api.post('/biometric/verify', {
//         type,
//         data
//       });
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   },
// };

// // Export individual functions that RegisterOrganizationScreen expects
// export const { register, registerOrganization } = authService;

// // Default export
// export default api;