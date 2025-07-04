export const CONSTANTS = {
  // JWT
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '30d',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  AUTH_RATE_LIMIT_MAX: 5,
  
  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // ZKP
  ZKP_CIRCUIT_PATH: './src/zkp/circuits',
  ZKP_PROOF_EXPIRY: 5 * 60 * 1000, // 5 minutes
  
  // Attendance
  ATTENDANCE_WINDOW: 30 * 60 * 1000, // 30 minutes
  LATE_THRESHOLD: 15 * 60 * 1000, // 15 minutes
  
  // Location
  DEFAULT_LOCATION_RADIUS: 500, // meters
  LOCATION_ACCURACY_THRESHOLD: 50, // meters
};

export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ZKP_GENERATION_FAILED: 'ZKP_GENERATION_FAILED',
  ZKP_VERIFICATION_FAILED: 'ZKP_VERIFICATION_FAILED',
  BIOMETRIC_MISMATCH: 'BIOMETRIC_MISMATCH',
  LOCATION_OUTSIDE_BOUNDS: 'LOCATION_OUTSIDE_BOUNDS',
};