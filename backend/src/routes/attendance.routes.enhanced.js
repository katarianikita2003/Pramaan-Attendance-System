// backend/src/routes/attendance.routes.enhanced.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import attendanceController from '../controllers/attendance.controller.enhanced.js';

const router = express.Router();

router.get('/today-status', authenticateToken, attendanceController.getTodayStatus);

// Scholar routes - QR generation flow
router.post('/generate-proof', 
  authenticateToken, 
  authorizeRoles(['scholar']), 
  attendanceController.generateAttendanceProof
);

router.get('/history',
  authenticateToken,
  authorizeRoles(['scholar']),
  attendanceController.getAttendanceHistory
);

// Admin routes - QR verification flow
router.post('/verify-qr',
  authenticateToken,
  authorizeRoles(['admin', 'super_admin']),
  attendanceController.verifyAttendanceQR
);

router.get('/pending-verifications',
  authenticateToken,
  authorizeRoles(['admin', 'super_admin']),
  attendanceController.getPendingVerifications
);

// Legacy routes for backward compatibility
router.post('/mark', 
  authenticateToken, 
  authorizeRoles(['scholar']), 
  async (req, res) => {
    res.status(400).json({
      success: false,
      error: 'This endpoint is deprecated. Please use /generate-proof for QR-based attendance'
    });
  }
);

// Public verification route - for external verification
router.get('/verify/:proofId', async (req, res) => {
  try {
    const { proofId } = req.params;
    
    // This would be used for external verification without admin login
    // For now, return basic info
    res.json({
      success: true,
      message: 'Please use the admin app to verify attendance proofs'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

// Analytics routes
router.get('/stats/:scholarId',
  authenticateToken,
  authorizeRoles(['admin', 'scholar']),
  async (req, res) => {
    try {
      const { scholarId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Check authorization
      if (req.user.role === 'scholar' && req.user.id !== scholarId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get attendance stats
      const Attendance = (await import('../models/Attendance.enhanced.js')).default;
      const stats = await Attendance.getStatsByScholar(
        scholarId,
        startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : null
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);

// Organization-wide attendance (admin only)
router.get('/organization/:date?',
  authenticateToken,
  authorizeRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      const date = req.params.date ? new Date(req.params.date) : new Date();
      
      // Set date range for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const Attendance = (await import('../models/Attendance.enhanced.js')).default;
      const attendances = await Attendance.find({
        organizationId,
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).populate('scholarId', 'scholarId personalInfo academicInfo');

      const summary = {
        total: attendances.length,
        verified: attendances.filter(a => a.status === 'verified').length,
        pending: attendances.filter(a => a.status === 'pending_verification').length,
        expired: attendances.filter(a => a.status === 'expired').length
      };

      res.json({
        success: true,
        data: {
          date: date.toISOString().split('T')[0],
          summary,
          attendances: attendances.map(att => ({
            id: att._id,
            scholar: {
              id: att.scholarId._id,
              scholarId: att.scholarId.scholarId,
              name: att.scholarId.personalInfo.name,
              department: att.scholarId.academicInfo.department
            },
            status: att.displayStatus,
            type: att.type,
            timestamp: att.createdAt,
            verifiedAt: att.verifiedAt
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization attendance'
      });
    }
  }
);

export default router;