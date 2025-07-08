// backend/src/middleware/validation.middleware.js
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', errors.array());
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        field: paramName
      });
    }
    
    next();
  };
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove any script tags
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitize(obj[key]);
      }
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (page < 1) {
    return res.status(400).json({
      error: 'Page number must be greater than 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: 'Limit must be between 1 and 100'
    });
  }
  
  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit
  };
  
  next();
};

/**
 * Validate date range
 */
export const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({
      error: 'Invalid start date format'
    });
  }
  
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({
      error: 'Invalid end date format'
    });
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        error: 'Start date must be before end date'
      });
    }
    
    // Maximum 1 year range
    const maxRange = 365 * 24 * 60 * 60 * 1000;
    if (end - start > maxRange) {
      return res.status(400).json({
        error: 'Date range cannot exceed 1 year'
      });
    }
  }
  
  next();
};

// Helper function to validate date
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

export default {
  handleValidationErrors,
  validateObjectId,
  sanitizeInput,
  validatePagination,
  validateDateRange
};