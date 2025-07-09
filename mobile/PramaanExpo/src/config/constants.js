// mobile/PramaanExpo/src/config/constants.js
export const API_BASE_URL = 'http://10.179.83.32:5000/api';
export const BASE_URL = 'http://10.179.83.32:5000';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  USER_TYPE: 'userType',
  ORGANIZATION_CODE: 'organizationCode',
};

export const USER_TYPES = {
  ADMIN: 'admin',
  SCHOLAR: 'scholar',
};

export const API_ENDPOINTS = {
  // Auth endpoints
  ADMIN_LOGIN: '/auth/admin/login',
  SCHOLAR_LOGIN: '/auth/scholar/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh-token',
  
  // Organization endpoints
  ORGANIZATION_DETAILS: '/organization/details',
  ORGANIZATION_SETTINGS: '/organization/settings',
  ORGANIZATION_BOUNDARIES: '/organization/boundaries',
  
  // Scholar endpoints
  SCHOLAR_STATS: '/scholar/stats',
  SCHOLAR_PROFILE: '/scholar/profile',
  SCHOLAR_ATTENDANCE_HISTORY: '/scholar/attendance-history',
  
  // Attendance endpoints
  MARK_ATTENDANCE: '/attendance/mark',
  GENERATE_PROOF: '/attendance/generate-proof',
  VERIFY_PROOF: '/attendance/verify',
  ATTENDANCE_RECORDS: '/attendance/records',
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SCHOLARS: '/admin/scholars',
  ADMIN_REPORTS: '/admin/reports/attendance',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

export const TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  UPLOAD: 120000, // 2 minutes
  DOWNLOAD: 60000, // 1 minute
};

export default {
  API_BASE_URL,
  BASE_URL,
  STORAGE_KEYS,
  USER_TYPES,
  API_ENDPOINTS,
  HTTP_STATUS,
  TIMEOUTS,
};