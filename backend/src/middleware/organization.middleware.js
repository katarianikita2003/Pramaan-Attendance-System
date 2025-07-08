// backend/src/middleware/organization.middleware.js
import Organization from '../models/Organization.js';
import logger from '../utils/logger.js';

/**
 * Check if organization is active and verified
 */
export const requireActiveOrganization = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    
    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    if (!organization.isActive) {
      return res.status(403).json({ error: 'Organization is inactive' });
    }
    
    if (!organization.isVerified) {
      return res.status(403).json({ error: 'Organization is not verified' });
    }
    
    // Check subscription
    if (!organization.isSubscriptionActive()) {
      return res.status(403).json({ error: 'Organization subscription has expired' });
    }
    
    req.organization = organization;
    next();
  } catch (error) {
    logger.error('Organization middleware error:', error);
    res.status(500).json({ error: 'Failed to verify organization' });
  }
};

/**
 * Check organization limits
 */
export const checkOrganizationLimits = async (req, res, next) => {
  try {
    const organization = req.organization || await Organization.findById(req.user.organizationId);
    
    // Check scholar limit
    if (req.path.includes('scholar') && req.method === 'POST') {
      if (!organization.canAddMoreScholars()) {
        return res.status(403).json({ 
          error: 'Scholar limit reached',
          limit: organization.subscription.scholarLimit,
          current: organization.stats.totalScholars
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Organization limits check error:', error);
    res.status(500).json({ error: 'Failed to check organization limits' });
  }
};

export default {
  requireActiveOrganization,
  checkOrganizationLimits
};