// ===== backend/src/middleware/rateLimit.middleware.js =====
import rateLimit from 'express-rate-limit';
import { CONSTANTS } from '../config/constants.js';

export const rateLimiters = {
  // General API rate limiter
  general: rateLimit({
    windowMs: CONSTANTS.RATE_LIMIT_WINDOW,
    max: CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  // Strict rate limiter for auth endpoints
  auth: rateLimit({
    windowMs: CONSTANTS.RATE_LIMIT_WINDOW,
    max: CONSTANTS.AUTH_RATE_LIMIT_MAX,
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  }),
  
  // Rate limiter for file uploads
  upload: rateLimit({
    windowMs: CONSTANTS.RATE_LIMIT_WINDOW,
    max: 10,
    message: 'Too many file uploads, please try again later.'
  }),
  
  // Rate limiter for proof generation
  proof: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many proof generation requests, please try again later.'
  })
};