// mobile/PramaanExpo/src/config/constants.ts - Update this section
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
  SCHOLAR_REGISTER: '/scholar/register', // This is the correct endpoint
  
  // Admin endpoints
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_SCHOLARS: '/admin/scholars',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_STATS: '/admin/stats',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADD_SCHOLAR: '/scholar/register', // Admin adds scholars via scholar/register
  
  // Attendance endpoints
  MARK_ATTENDANCE: '/attendance/mark',
  ATTENDANCE_HISTORY: '/attendance/history',
  ATTENDANCE_STATS: '/attendance/stats',
  VERIFY_PROOF: '/attendance/verify',
  GENERATE_CERTIFICATE: '/attendance/certificate',
};