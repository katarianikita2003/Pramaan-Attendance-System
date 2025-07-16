// backend/src/middleware/role.middleware.js
import logger from '../utils/logger.js';

export const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get user role
      const userRole = req.user.role || req.user.userType;

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Access denied for user ${req.user.id} with role ${userRole}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error'
      });
    }
  };
};

// Alias for backward compatibility
export const requireRole = authorizeRoles;