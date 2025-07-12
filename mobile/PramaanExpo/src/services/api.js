// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = 'http://10.105.120.32:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
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
      console.log('API Request:', config.method.toUpperCase(), config.url.replace(API_BASE_URL, ''));
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
    console.log('API Response:', response.config.url.replace(API_BASE_URL, ''), response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
      // You might want to navigate to login screen here
    }
    
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  async adminLogin(email, password) {
    try {
      const response = await api.post('/auth/admin/login', { email, password });
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
      const response = await api.post('/auth/register', data);
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

// // mobile/PramaanExpo/src/services/api.js
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// // Update this IP to your computer's local IP address
// const API_BASE_URL = 'http://10.105.120.32:5000/api'; // Your backend IP

// // Create axios instance
// const api = axios.create({
//   baseURL: API_BASE_URL,
//   timeout: 10000,
//   headers: {
//     'Accept': 'application/json',
//     'Content-Type': 'application/json',
//   },
// });

// // Request interceptor
// api.interceptors.request.use(
//   async (config) => {
//     try {
//       // Get auth token
//       const token = await AsyncStorage.getItem('authToken');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }

//       // Debug logging in development
//       if (__DEV__) {
//         console.log('API Request:', config.method?.toUpperCase(), config.url);
//       }

//       return config;
//     } catch (error) {
//       console.error('Request interceptor error:', error);
//       return config;
//     }
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor
// api.interceptors.response.use(
//   (response) => {
//     if (__DEV__) {
//       console.log('API Response:', response.config.url, response.status);
//     }
//     return response;
//   },
//   async (error) => {
//     if (__DEV__) {
//       console.error('API Error:', error.response?.status, error.message);
//     }

//     // Handle common errors
//     if (error.response) {
//       switch (error.response.status) {
//         case 401:
//           // Unauthorized - clear token and redirect to login
//           await AsyncStorage.removeItem('authToken');
//           await AsyncStorage.removeItem('userData');
//           break;
//         case 403:
//           console.error('Forbidden - check permissions');
//           break;
//         case 404:
//           console.error('Resource not found');
//           break;
//         case 500:
//           console.error('Server error');
//           break;
//       }
//     } else if (error.request) {
//       console.error('Network error - no response received');
//     } else {
//       console.error('Error setting up request:', error.message);
//     }

//     return Promise.reject(error);
//   }
// );

// // Auth service
// export const authService = {
//   adminLogin: async (email, password) => {
//     const response = await api.post('/auth/admin-login', { email, password });
//     return response.data;
//   },
  
//   scholarLogin: async (email, password, organizationCode) => {
//     const response = await api.post('/auth/scholar-login', { 
//       email, 
//       password, 
//       organizationCode 
//     });
//     return response.data;
//   },
  
//   registerOrganization: async (data) => {
//     const response = await api.post('/auth/register-organization', data);
//     return response.data;
//   },
  
//   logout: async () => {
//     await AsyncStorage.removeItem('authToken');
//     await AsyncStorage.removeItem('userData');
//   }
// };

// // Admin service
// export const adminService = {
//   getDashboard: async () => {
//     const response = await api.get('/admin/dashboard');
//     return response.data;
//   },
  
//   getScholars: async () => {
//     const response = await api.get('/admin/scholars');
//     return response.data;
//   },
  
//   addScholar: async (scholarData) => {
//     const response = await api.post('/admin/scholars', scholarData);
//     return response.data;
//   },
  
//   getAnalytics: async () => {
//     const response = await api.get('/admin/analytics');
//     return response.data;
//   },
  
//   getReports: async (params) => {
//     const response = await api.get('/admin/reports', { params });
//     return response.data;
//   }
// };

// // Organization service
// export const organizationService = {
//   getDetails: async () => {
//     const response = await api.get('/organization/details');
//     return response.data;
//   },
  
//   updateDetails: async (data) => {
//     const response = await api.put('/organization/details', data);
//     return response.data;
//   },
  
//   getSettings: async () => {
//     const response = await api.get('/organization/settings');
//     return response.data;
//   },
  
//   updateSettings: async (settings) => {
//     const response = await api.put('/organization/settings', settings);
//     return response.data;
//   }
// };

// // Scholar service
// export const scholarService = {
//   getProfile: async () => {
//     const response = await api.get('/scholar/profile');
//     return response.data;
//   },
  
//   getAttendanceHistory: async () => {
//     const response = await api.get('/scholar/attendance/history');
//     return response.data;
//   },
  
//   markAttendance: async (biometricData, location) => {
//     const response = await api.post('/attendance/mark', {
//       biometricData,
//       location
//     });
//     return response.data;
//   },
  
//   getStats: async () => {
//     const response = await api.get('/scholar/stats');
//     return response.data;
//   }
// };

// // Attendance service
// export const attendanceService = {
//   markAttendance: async (data) => {
//     const response = await api.post('/attendance/mark', data);
//     return response.data;
//   },
  
//   verifyProof: async (proofId) => {
//     const response = await api.get(`/attendance/verify/${proofId}`);
//     return response.data;
//   },
  
//   getHistory: async (scholarId) => {
//     const response = await api.get('/attendance/history', {
//       params: { scholarId }
//     });
//     return response.data;
//   }
// };

// export default api;