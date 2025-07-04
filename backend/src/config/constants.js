// ===== backend/src/config/constants.js =====
export const CONSTANTS = {
  // JWT
  JWT_EXPIRES_IN: '30d',
  JWT_REFRESH_EXPIRES_IN: '90d',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  AUTH_RATE_LIMIT_MAX: 5,
  
  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  
  // Biometric
  BIOMETRIC_SALT_ROUNDS: 12,
  FINGERPRINT_MIN_QUALITY: 0.7,
  FACE_MIN_QUALITY: 0.8,
  LIVENESS_THRESHOLD: 0.9,
  
  // Location
  DEFAULT_CAMPUS_RADIUS: 500, // meters
  LOCATION_ACCURACY_THRESHOLD: 50, // meters
  
  // ZKP
  ZKP_PROOF_EXPIRY: 5 * 60 * 1000, // 5 minutes
  FIELD_SIZE: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'),
  
  // Organization
  ORGANIZATION_TYPES: ['university', 'school', 'college', 'office', 'other'],
  DEFAULT_WORKING_HOURS: { start: '09:00', end: '18:00' },
  
  // Subscription plans
  SUBSCRIPTION_PLANS: {
    basic: { maxScholars: 100, features: ['basic'] },
    pro: { maxScholars: 1000, features: ['basic', 'analytics', 'api'] },
    enterprise: { maxScholars: -1, features: ['all'] }
  }
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