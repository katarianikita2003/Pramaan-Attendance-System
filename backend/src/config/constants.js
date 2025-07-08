// backend/src/config/constants.js
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19000'
    ];
    
    // Allow requests with no origin (like mobile apps)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Auth-Token']
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  SCHOLAR: 'scholar'
};

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused'
};

export const BIOMETRIC_TYPES = {
  FACE: 'face',
  FINGERPRINT: 'fingerprint'
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'User not found',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  INVALID_BIOMETRIC: 'Invalid biometric data',
  ATTENDANCE_ALREADY_MARKED: 'Attendance already marked for today',
  INVALID_LOCATION: 'Invalid location for attendance',
  SERVER_ERROR: 'Internal server error'
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  ATTENDANCE_MARKED: 'Attendance marked successfully',
  SCHOLAR_CREATED: 'Scholar created successfully',
  ORGANIZATION_CREATED: 'Organization created successfully'
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg']
};

export const JWT_EXPIRY = {
  ACCESS_TOKEN: '1d',
  REFRESH_TOKEN: '7d'
};

export const LOCATION_THRESHOLD = 100; // meters

export default {
  corsOptions,
  ROLES,
  ATTENDANCE_STATUS,
  BIOMETRIC_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
  FILE_UPLOAD,
  JWT_EXPIRY,
  LOCATION_THRESHOLD
};