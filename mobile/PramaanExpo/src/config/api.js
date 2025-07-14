// mobile/PramaanExpo/src/config/api.js
import { Platform } from 'react-native';

// Update this IP address to your computer's IP address
const YOUR_COMPUTER_IP = '10.13.117.32'; // From your logs

// API Base URLs
export const API_BASE_URL = Platform.select({
  ios: `http://localhost:5000/api`,
  android: `http://${YOUR_COMPUTER_IP}:5000/api`,
  default: `http://localhost:5000/api`,
});

export const BASE_URL = Platform.select({
  ios: `http://localhost:5000`,
  android: `http://${YOUR_COMPUTER_IP}:5000`,
  default: `http://localhost:5000`,
});

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  ADMIN_LOGIN: '/auth/admin-login',
  SCHOLAR_LOGIN: '/auth/scholar/login',
  REGISTER_ORGANIZATION: '/auth/register-organization',
  REFRESH_TOKEN: '/auth/refresh-token',
  LOGOUT: '/auth/logout',
  
  // Organization endpoints
  ORGANIZATION_DETAILS: '/organization/details',
  ORGANIZATION_SETTINGS: '/organization/settings',
  ORGANIZATION_BOUNDARIES: '/organization/boundaries',
  
  // Scholar endpoints
  SCHOLAR_PROFILE: '/scholar/profile',
  SCHOLAR_STATS: '/scholar/stats',
  SCHOLAR_ATTENDANCE_HISTORY: '/scholar/attendance/history',
  SCHOLAR_ATTENDANCE_TODAY: '/scholar/attendance/today',
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SCHOLARS: '/admin/scholars',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_STATS: '/admin/stats',
  
  // Attendance endpoints
  MARK_ATTENDANCE: '/attendance/mark',
  VERIFY_PROOF: '/attendance/verify',
  ATTENDANCE_HISTORY: '/attendance/history',
  ATTENDANCE_STATS: '/attendance/stats',
  
  // Biometric endpoints
  BIOMETRIC_ENROLL_FACE: '/biometric/enroll/face',
  BIOMETRIC_ENROLL_FINGERPRINT: '/biometric/enroll/fingerprint',
  BIOMETRIC_VERIFY: '/biometric/verify',
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  USER_TYPE: 'userType',
  ORGANIZATION_CODE: 'organizationCode',
  BIOMETRIC_ENROLLED: 'biometricEnrolled',
};

// Other constants
export const TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;