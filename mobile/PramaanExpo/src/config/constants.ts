// mobile/PramaanExpo/src/config/constants.ts
// API Configuration
export const API_BASE_URL = 'http://10.105.120.32:5000/api';

// Timeout settings
export const TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  UPLOAD: 30000,  // 30 seconds
  DOWNLOAD: 60000 // 60 seconds
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@pramaan_auth_token',
  USER_DATA: '@pramaan_user_data',
  USER_TYPE: '@pramaan_user_type',
  ORGANIZATION_CODE: '@pramaan_org_code',
  BIOMETRIC_DATA: '@pramaan_biometric',
  SETTINGS: '@pramaan_settings',
  THEME: '@pramaan_theme'
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  ADMIN_LOGIN: '/auth/admin-login',
  SCHOLAR_LOGIN: '/auth/scholar/login',
  REGISTER_ORGANIZATION: '/auth/register-organization',
  REFRESH_TOKEN: '/auth/refresh-token',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  LOGOUT: '/auth/logout',
  
  // Organization endpoints
  ORGANIZATION_DETAILS: '/organization/details',
  ORGANIZATION_SETTINGS: '/organization/settings',
  ORGANIZATION_BOUNDARIES: '/organization/boundaries',
  ORGANIZATION_STATS: '/organization/stats',
  
  // Scholar endpoints
  SCHOLAR_PROFILE: '/scholar/profile',
  SCHOLAR_STATS: '/scholar/stats',
  SCHOLAR_ATTENDANCE_HISTORY: '/scholar/attendance/history',
  SCHOLAR_REGISTER: '/scholar/register',
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SCHOLARS: '/admin/scholars',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_STATS: '/admin/stats',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADD_SCHOLAR: '/scholar/register',
  
  // Attendance endpoints
  MARK_ATTENDANCE: '/attendance/mark',
  ATTENDANCE_HISTORY: '/attendance/history',
  ATTENDANCE_STATS: '/attendance/stats',
  VERIFY_PROOF: '/attendance/verify',
  GENERATE_CERTIFICATE: '/attendance/certificate',
};

// App constants
export const APP_NAME = 'Pramaan';

// User types
export const USER_TYPES = {
  ADMIN: 'admin',
  SCHOLAR: 'scholar',
};

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused'
};

// Biometric types
export const BIOMETRIC_TYPES = {
  FACE: 'face',
  FINGERPRINT: 'fingerprint',
};

// Colors
export const COLORS = {
  PRIMARY: '#6C63FF',
  SUCCESS: '#27AE60',
  ERROR: '#E74C3C',
  WARNING: '#F39C12',
  BACKGROUND: '#F8F9FA',
  TEXT: '#2C3E50',
};

// Default export
export default {
  API_BASE_URL,
  TIMEOUTS,
  STORAGE_KEYS,
  API_ENDPOINTS,
  APP_NAME,
  USER_TYPES,
  ATTENDANCE_STATUS,
  BIOMETRIC_TYPES,
  COLORS
};