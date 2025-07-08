// backend/src/middleware/rateLimit.middleware.js
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }
});

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later'
    });
  }
});

// Rate limit for attendance marking
export const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // Max 2 requests per minute
  message: 'Please wait before marking attendance again',
  keyGenerator: (req) => {
    // Use user ID instead of IP for authenticated requests
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Attendance rate limit exceeded for user: ${req.user?.id}`);
    res.status(429).json({
      error: 'Please wait before marking attendance again'
    });
  }
});

// Rate limit for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 uploads per hour
  message: 'Upload limit exceeded, please try again later',
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Dynamic rate limiter based on user role
export const dynamicLimiter = (options = {}) => {
  return (req, res, next) => {
    const limits = {
      scholar: { windowMs: 15 * 60 * 1000, max: 50 },
      admin: { windowMs: 15 * 60 * 1000, max: 200 },
      super_admin: { windowMs: 15 * 60 * 1000, max: 500 },
      default: { windowMs: 15 * 60 * 1000, max: 30 }
    };

    const userRole = req.user?.role || 'default';
    const limit = limits[userRole] || limits.default;

    const limiter = rateLimit({
      ...limit,
      ...options,
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      }
    });

    limiter(req, res, next);
  };
};

export default {
  apiLimiter,
  authLimiter,
  attendanceLimiter,
  uploadLimiter,
  dynamicLimiter
};