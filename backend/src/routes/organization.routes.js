// ===== backend/src/routes/organization.routes.js =====
import express from 'express';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import Scholar from '../models/Scholar.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get organization details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if user has access to this organization
    if (req.user.organizationId !== organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      organization: {
        id: organization._id,
        name: organization.name,
        code: organization.code,
        type: organization.type,
        settings: organization.settings,
        subscription: organization.subscription,
        stats: organization.stats
      }
    });
  } catch (error) {
    logger.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization settings
router.put('/:id/settings', 
  authenticateToken, 
  requireRole('admin'),
  [
    body('locationBounds.center.latitude').optional().isFloat(),
    body('locationBounds.center.longitude').optional().isFloat(),
    body('locationBounds.radius').optional().isInt({ min: 50, max: 5000 }),
    body('workingHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('workingHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const organization = await Organization.findById(req.params.id);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      if (req.user.organizationId !== organization._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update settings
      Object.assign(organization.settings, req.body);
      organization.metadata.lastModifiedBy = req.user.adminEmail;
      
      await organization.save();
      
      res.json({
        message: 'Settings updated successfully',
        settings: organization.settings
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// Get organization statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.params.id;
    
    if (req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get various statistics
    const [
      totalScholars,
      activeScholars,
      todayAttendance,
      monthlyStats
    ] = await Promise.all([
      Scholar.countDocuments({ organizationId }),
      Scholar.countDocuments({ organizationId, 'status.isActive': true }),
      getTodayAttendance(organizationId),
      getMonthlyStats(organizationId)
    ]);
    
    res.json({
      stats: {
        totalScholars,
        activeScholars,
        todayAttendance,
        monthlyStats,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

async function getTodayAttendance(organizationId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const AttendanceProof = mongoose.model('AttendanceProof');
  const result = await AttendanceProof.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        date: { $gte: today }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const stats = result.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
  
  return {
    present: stats.present || 0,
    absent: stats.absent || 0,
    late: stats.late || 0,
    total: (stats.present || 0) + (stats.absent || 0) + (stats.late || 0)
  };
}

async function getMonthlyStats(organizationId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const AttendanceProof = mongoose.model('AttendanceProof');
  const dailyStats = await AttendanceProof.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        date: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          status: "$status"
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.date": 1 }
    }
  ]);
  
  return dailyStats;
}

export default router;