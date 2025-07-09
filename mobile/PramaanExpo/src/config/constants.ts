// mobile/PramaanExpo/src/config/constants.ts
import { Platform } from 'react-native';

// API Configuration - UPDATE THIS WITH YOUR BACKEND IP
export const API_BASE_URL = 'http://10.179.83.32:5000/api'; // Use your actual backend IP

// Alternative configuration if you want platform-specific URLs:
/*
export const API_BASE_URL = Platform.select({
  android: __DEV__ 
    ? 'http://10.179.83.32:5000/api'  // Your backend IP for Android device
    : 'https://api.pramaan.app/api',
  ios: __DEV__
    ? 'http://10.179.83.32:5000/api'  // Your backend IP for iOS device
    : 'https://api.pramaan.app/api',
  default: 'http://10.179.83.32:5000/api'
});
*/

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  USER_TYPE: 'userType',
  ORGANIZATION_CODE: 'organizationCode',
  BIOMETRIC_ENROLLED: 'biometricEnrolled',
  OFFLINE_ATTENDANCE: 'offlineAttendance',
  APP_SETTINGS: 'appSettings',
};

// API Endpoints - Updated to match backend routes
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
  ORGANIZATION_SETTINGS: '/organization/details',
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
  
  // Attendance endpoints
  MARK_ATTENDANCE: '/attendance/mark',
  ATTENDANCE_HISTORY: '/attendance/history',
  ATTENDANCE_STATS: '/attendance/stats',
  VERIFY_PROOF: '/attendance/verify',
  GENERATE_CERTIFICATE: '/attendance/certificate',
};

// Timeouts
export const TIMEOUTS = {
  DEFAULT: 30000,      // 30 seconds
  UPLOAD: 60000,       // 60 seconds
  DOWNLOAD: 60000,     // 60 seconds
  BIOMETRIC: 120000,   // 2 minutes
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'Pramaan',
  VERSION: '2.0.0',
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  LOCATION_ACCURACY: 20, // meters
  LOCATION_CHECK_INTERVAL: 5000, // 5 seconds
  MAX_OFFLINE_DAYS: 7,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  LOCATION_REQUIRED: 'Location access is required for attendance.',
  BIOMETRIC_REQUIRED: 'Biometric authentication is required.',
  ORGANIZATION_NOT_FOUND: 'Organization not found.',
  SCHOLAR_NOT_FOUND: 'Scholar not found.',
  ATTENDANCE_ALREADY_MARKED: 'Attendance already marked for today.',
  OUTSIDE_LOCATION: 'You are outside the organization premises.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  ATTENDANCE_MARKED: 'Attendance marked successfully!',
  PROFILE_UPDATED: 'Profile updated successfully.',
  SCHOLAR_ADDED: 'Scholar added successfully.',
  ORGANIZATION_REGISTERED: 'Organization registered successfully!',
};

// Colors
export const COLORS = {
  PRIMARY: '#6C63FF',
  SECONDARY: '#FF6B6B',
  SUCCESS: '#4CAF50',
  WARNING: '#FFC107',
  ERROR: '#F44336',
  INFO: '#2196F3',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',
  BORDER: '#E0E0E0',
};

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  SCHOLAR_ID: /^[A-Z0-9]{6,}$/,
  ORGANIZATION_CODE: /^[A-Z0-9]{6,}$/,
};