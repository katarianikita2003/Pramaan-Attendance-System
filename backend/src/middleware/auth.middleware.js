// ===== backend/src/middleware/auth.middleware.js =====
import jwt from 'jsonwebtoken';
import Organization from '../models/Organization.js';
import Scholar from '../models/Scholar.js';
import logger from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Verify user still exists and is active
    if (decoded.role === 'admin') {
      const organization = await Organization.findById(decoded.organizationId);
      if (!organization || !organization.isActive) {
        return res.status(401).json({ error: 'Invalid organization' });
      }
      req.organization = organization;
    } else if (decoded.role === 'scholar') {
      const scholar = await Scholar.findById(decoded.scholarId);
      if (!scholar || !scholar.status.isActive) {
        return res.status(401).json({ error: 'Invalid scholar account' });
      }
      req.scholar = scholar;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.organization) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (!req.organization.isSubscriptionValid()) {
      return res.status(403).json({ 
        error: 'Subscription expired', 
        details: 'Please renew your subscription to continue'
      });
    }

    next();
  } catch (error) {
    logger.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to verify subscription' });
  }
};