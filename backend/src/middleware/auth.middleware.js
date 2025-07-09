// backend/src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import logger from '../utils/logger.js';

/**
 * Authenticate JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    logger.info('Auth check - Header:', authHeader ? 'Present' : 'Missing', ', Token:', token ? 'Present' : 'Missing');

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Log first few characters of token for debugging
    logger.info('Token preview:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    logger.info('Token decoded - UserId:', decoded.userId, ', Role:', decoded.role);
    logger.info('Decoded token full content:', JSON.stringify(decoded, null, 2));
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
      scholarId: decoded.scholarId,
      permissions: decoded.permissions
    };

    logger.info('req.user set to:', JSON.stringify(req.user, null, 2));

    // Verify user still exists and is active
    if (decoded.role === 'admin' || decoded.role === 'super_admin' || decoded.role === 'manager') {
      logger.info('Looking for admin with ID:', decoded.userId);
      const admin = await Admin.findById(decoded.userId);
      
      if (!admin) {
        logger.error('Admin not found with ID:', decoded.userId);
        return res.status(401).json({ error: 'Account not found' });
      }
      
      if (!admin.isActive) {
        logger.error('Admin found but inactive:', decoded.userId);
        return res.status(401).json({ error: 'Account is inactive' });
      }
      
      logger.info('Admin verified - organizationId in DB:', admin.organizationId);
    } else if (decoded.role === 'scholar') {
      const scholar = await Scholar.findById(decoded.userId);
      if (!scholar || scholar.status !== 'active') {
        return res.status(401).json({ error: 'Account inactive or not found' });
      }
    }

    next();
  } catch (error) {
    logger.error('Auth error details:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Require specific role
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied - Required roles: ${allowedRoles}, User role: ${req.user.role}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Require specific permission
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Scholars don't have permissions
    if (req.user.role === 'scholar') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check admin permissions
    const admin = await Admin.findById(req.user.id);
    if (!admin || !admin.hasPermission(permission)) {
      logger.warn(`Permission denied - Required: ${permission}, User: ${req.user.id}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission
      });
    }

    next();
  };
};

/**
 * Verify organization access
 */
export const verifyOrganizationAccess = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId || req.body.organizationId || req.user.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Super admins can access any organization
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user belongs to the organization
    if (req.user.organizationId !== organizationId) {
      logger.warn(`Organization access denied - User org: ${req.user.organizationId}, Requested org: ${organizationId}`);
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    next();
  } catch (error) {
    logger.error('Organization access verification error:', error);
    res.status(500).json({ error: 'Access verification failed' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pramaan-secret-key');
      req.user = {
        id: decoded.id,
        organizationId: decoded.organizationId,
        role: decoded.role
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

export default {
  authenticateToken,
  requireRole,
  requirePermission,
  verifyOrganizationAccess,
  optionalAuth
};