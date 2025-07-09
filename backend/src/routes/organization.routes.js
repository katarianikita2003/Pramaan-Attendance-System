// backend/src/routes/organization.routes.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import { authenticateToken, requireRole, verifyOrganizationAccess } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get organization details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID not found' });
    }

    const organization = await Organization.findById(organizationId)
      .select('-__v')
      .lean();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get stats
    const [adminCount, scholarCount] = await Promise.all([
      Admin.countDocuments({ organizationId: organization._id, status: 'active' }),
      Scholar.countDocuments({ organizationId: organization._id, status: 'active' })
    ]);

    res.json({
      success: true,
      organization: {
        ...organization,
        stats: {
          admins: adminCount,
          scholars: scholarCount,
          maxScholars: organization.subscription?.maxScholars || 100
        }
      }
    });
  } catch (error) {
    logger.error('Get organization details error:', error);
    res.status(500).json({ error: 'Failed to fetch organization details' });
  }
});

// Update organization settings
router.put('/settings', 
  authenticateToken, 
  requireRole('admin', 'super_admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('contact.email').optional().isEmail(),
    body('contact.phone').optional().trim(),
    body('contact.address').optional().trim(),
    body('location.radius').optional().isInt({ min: 50, max: 5000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const organizationId = req.user.organizationId;
      const updates = req.body;

      const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      logger.info(`Organization settings updated: ${organization.code}`);

      res.json({
        success: true,
        organization
      });
    } catch (error) {
      logger.error('Update organization settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// Get organization boundaries
router.get('/boundaries', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const organization = await Organization.findById(organizationId)
      .select('location boundaries')
      .lean();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      location: organization.location,
      boundaries: organization.boundaries
    });
  } catch (error) {
    logger.error('Get organization boundaries error:', error);
    res.status(500).json({ error: 'Failed to fetch boundaries' });
  }
});

// Update organization boundaries
router.put('/boundaries',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  [
    body('boundaries').isArray(),
    body('boundaries.*.latitude').isFloat({ min: -90, max: 90 }),
    body('boundaries.*.longitude').isFloat({ min: -180, max: 180 }),
    body('location.coordinates.latitude').optional().isFloat({ min: -90, max: 90 }),
    body('location.coordinates.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('location.radius').optional().isInt({ min: 50, max: 5000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const organizationId = req.user.organizationId;
      const { boundaries, location } = req.body;

      const updateData = { boundaries };
      if (location) {
        updateData.location = location;
      }

      const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      logger.info(`Organization boundaries updated: ${organization.code}`);

      res.json({
        success: true,
        boundaries: organization.boundaries,
        location: organization.location
      });
    } catch (error) {
      logger.error('Update organization boundaries error:', error);
      res.status(500).json({ error: 'Failed to update boundaries' });
    }
  }
);

// Get subscription details
router.get('/subscription', authenticateToken, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const organization = await Organization.findById(organizationId)
      .select('subscription')
      .lean();

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      subscription: organization.subscription
    });
  } catch (error) {
    logger.error('Get subscription details error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

export default router;