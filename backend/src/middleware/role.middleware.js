// backend/src/middleware/role.middleware.js
import logger from '../utils/logger.js';

/**
 * Middleware to authorize based on user roles
 * @param {Array} allowedRoles - Array of roles that are allowed to access the route
 */
export const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Authorization failed - No user found in request');
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required' 
        });
      }

      // Check if user has required role
      const userRole = req.user.role;
      
      if (!userRole) {
        logger.warn('Authorization failed - No role found for user:', req.user.id);
        return res.status(403).json({ 
          success: false,
          error: 'Access denied - No role assigned' 
        });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Access denied - Required roles: ${allowedRoles.join(', ')}, User role: ${userRole}`);
        return res.status(403).json({ 
          success: false,
          error: 'Access denied - Insufficient permissions' 
        });
      }

      // User has required role, proceed
      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Authorization error' 
      });
    }
  };
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req, res, next) => {
  return authorizeRoles(['admin', 'super_admin'])(req, res, next);
};

/**
 * Middleware to check if user is a scholar
 */
export const isScholar = (req, res, next) => {
  return authorizeRoles(['scholar'])(req, res, next);
};

/**
 * Middleware to check if user owns the resource or is an admin
 * @param {Function} getResourceOwnerId - Function to get the owner ID from the resource
 */
export const authorizeOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // Admins can access any resource
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      // Get the owner ID of the resource
      const ownerId = await getResourceOwnerId(req);
      
      // Check if the user owns the resource
      if (ownerId && ownerId.toString() === req.user.id.toString()) {
        return next();
      }

      logger.warn(`Access denied - User ${req.user.id} tried to access resource owned by ${ownerId}`);
      return res.status(403).json({ 
        success: false,
        error: 'Access denied - You do not have permission to access this resource' 
      });
    } catch (error) {
      logger.error('Owner authorization error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Authorization error' 
      });
    }
  };
};

/**
 * Middleware to check organization membership
 */
export const checkOrganizationAccess = async (req, res, next) => {
  try {
    const userOrgId = req.user.organizationId;
    const requestedOrgId = req.params.organizationId || req.body.organizationId;

    // If no specific organization is requested, use user's organization
    if (!requestedOrgId) {
      return next();
    }

    // Check if user belongs to the requested organization
    if (userOrgId.toString() !== requestedOrgId.toString()) {
      logger.warn(`Organization access denied - User org: ${userOrgId}, Requested org: ${requestedOrgId}`);
      return res.status(403).json({ 
        success: false,
        error: 'Access denied - You cannot access resources from another organization' 
      });
    }

    next();
  } catch (error) {
    logger.error('Organization access check error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Authorization error' 
    });
  }
};

export default {
  authorizeRoles,
  isAdmin,
  isScholar,
  authorizeOwnerOrAdmin,
  checkOrganizationAccess
};