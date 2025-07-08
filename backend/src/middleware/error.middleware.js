// backend/src/middleware/error.middleware.js
import logger from '../utils/logger.js';
import { ERROR_CODES } from '../config/constants.js';

export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.userId
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: `Duplicate value for ${field}`,
      code: ERROR_CODES.DUPLICATE_ENTRY,
      field
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: ERROR_CODES.AUTHENTICATION_ERROR
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: ERROR_CODES.AUTHENTICATION_ERROR
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || 'UNKNOWN_ERROR'
    });
  }

  // Default error
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    code: ERROR_CODES.NOT_FOUND,
    path: req.path
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};