// backend/src/routes/scholar.routes.js
import express from 'express';
import Scholar from '../models/Scholar.js';
import Attendance from '../models/Attendance.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require scholar authentication
router.use(authenticateToken);
router.use(requireRole('scholar'));

// @route   GET /api/scholar/stats
// @desc    Get scholar statistics
// @access  Private (Scholar)
router.get('/stats', async (req, res) => {
  try {
    const scholarId = req.user.id;
    
    // Get total attendance records
    const attendanceRecords = await Attendance.find({
      scholarId,
      verified: true,
    });

    const totalDays = 100; // This should be calculated based on academic calendar
    const presentDays = attendanceRecords.length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = Math.round((presentDays / totalDays) * 100);

    // Get last attendance
    const lastAttendance = await Attendance.findOne({
      scholarId,
    }).sort({ timestamp: -1 });

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Simple streak calculation
    if (lastAttendance && 
        new Date(lastAttendance.timestamp).toDateString() === today.toDateString()) {
      streak = 1;
    }

    res.json({
      success: true,
      stats: {
        totalDays,
        presentDays,
        absentDays,
        attendancePercentage,
        lastAttendance: lastAttendance?.timestamp || null,
        streak,
      },
    });
  } catch (error) {
    logger.error('Scholar stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load statistics' 
    });
  }
});

// @route   GET /api/scholar/profile
// @desc    Get scholar profile
// @access  Private (Scholar)
router.get('/profile', async (req, res) => {
  try {
    const scholarId = req.user.id;
    
    const scholar = await Scholar.findById(scholarId)
      .select('-credentials.passwordHash -biometrics')
      .populate('organizationId', 'name code');

    if (!scholar) {
      return res.status(404).json({ 
        success: false, 
        error: 'Scholar not found' 
      });
    }

    res.json({
      success: true,
      scholar,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load profile' 
    });
  }
});

export default router;