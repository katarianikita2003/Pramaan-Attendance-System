// backend/src/routes/admin.routes.js
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import AttendanceProof from '../models/AttendanceProof.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get admin dashboard data
router.get('/dashboard', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    // Get organization details
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get statistics
    const [totalScholars, presentToday, totalAttendanceToday] = await Promise.all([
      Scholar.countDocuments({ 
        organizationId: organizationId,
        status: 'active' 
      }),
      AttendanceProof.distinct('scholarId', {
        organizationId: organizationId,
        'checkIn.timestamp': { $gte: today, $lt: tomorrow },
        isVerified: true
      }),
      AttendanceProof.countDocuments({
        organizationId: organizationId,
        'checkIn.timestamp': { $gte: today, $lt: tomorrow }
      })
    ]);

    const presentCount = presentToday.length;
    const absentToday = totalScholars - presentCount;
    const attendanceRate = totalScholars > 0 
      ? Math.round((presentCount / totalScholars) * 100) 
      : 0;

    res.json({
      success: true,
      stats: {
        totalScholars,
        presentToday: presentCount,
        absentToday,
        attendanceRate,
        organizationName: organization.name,
        organizationCode: organization.code
      }
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load dashboard data' 
    });
  }
});

// Get all scholars
router.get('/scholars', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = { 
      organizationId: organizationId,
      ...(search && {
        $or: [
          { 'personalInfo.name': { $regex: search, $options: 'i' } },
          { 'personalInfo.email': { $regex: search, $options: 'i' } },
          { scholarId: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const scholars = await Scholar.find(query)
      .select('-credentials.passwordHash')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Scholar.countDocuments(query);

    // Get today's attendance for each scholar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scholarIds = scholars.map(s => s._id);
    const todayAttendance = await AttendanceProof.find({
      scholarId: { $in: scholarIds },
      'checkIn.timestamp': { $gte: today, $lt: tomorrow },
      isVerified: true
    }).select('scholarId');

    const presentScholarIds = new Set(todayAttendance.map(a => a.scholarId.toString()));

    const scholarsWithAttendance = scholars.map(scholar => ({
      id: scholar._id,
      scholarId: scholar.scholarId,
      name: scholar.personalInfo.name,
      email: scholar.personalInfo.email,
      department: scholar.academicInfo?.department || 'N/A',
      status: scholar.status,
      presentToday: presentScholarIds.has(scholar._id.toString()),
      attendancePercentage: scholar.attendanceStats?.attendancePercentage || 0,
      totalDays: scholar.attendanceStats?.totalDays || 0
    }));

    res.json({
      success: true,
      scholars: scholarsWithAttendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get scholars error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch scholars' 
    });
  }
});

// Get attendance reports
router.get('/reports/attendance', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date(),
      department = 'all',
      status = 'all'
    } = req.query;

    const query = {
      organizationId: organizationId,
      'checkIn.timestamp': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const attendanceRecords = await AttendanceProof.find(query)
      .populate('scholarId', 'personalInfo.name scholarId academicInfo.department')
      .sort({ 'checkIn.timestamp': -1 })
      .limit(100);

    const records = attendanceRecords.map(record => ({
      date: record.checkIn.timestamp,
      scholarId: record.scholarId?.scholarId || 'Unknown',
      name: record.scholarId?.personalInfo?.name || 'Unknown',
      department: record.scholarId?.academicInfo?.department || 'N/A',
      time: new Date(record.checkIn.timestamp).toLocaleTimeString(),
      status: 'present',
      proofId: record.proofId
    }));

    res.json({
      success: true,
      records,
      filters: {
        startDate,
        endDate,
        department,
        status
      }
    });
  } catch (error) {
    logger.error('Get attendance reports error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch attendance reports' 
    });
  }
});

export default router;