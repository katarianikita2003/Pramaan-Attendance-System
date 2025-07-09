// backend/src/routes/admin.routes.js
import express from 'express';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Scholar from '../models/Scholar.js';
import AttendanceProof from '../models/AttendanceProof.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { CertificateService } from '../services/certificate.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const certificateService = new CertificateService();

// Get admin dashboard data
// Fix for admin dashboard route in backend/src/routes/admin.routes.js
router.get('/dashboard', 
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      
      if (!organizationId) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
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
      const [
        totalScholars,
        activeScholars,
        todayAttendance,
        weeklyAttendance
      ] = await Promise.all([
        Scholar.countDocuments({ organizationId }),
        Scholar.countDocuments({ organizationId, status: 'active' }),
        AttendanceProof.countDocuments({
          organizationId,
          date: { $gte: today, $lt: tomorrow }
        }),
        AttendanceProof.aggregate([
          {
            $match: {
              organizationId: new mongoose.Types.ObjectId(organizationId),
              date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);
      
      // Calculate attendance rate
      const attendanceRate = activeScholars > 0 
        ? Math.round((todayAttendance / activeScholars) * 100) 
        : 0;
      
      // Get recent attendance records
      const recentAttendance = await AttendanceProof.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('scholarId', 'scholarId personalInfo.name');
      
      res.json({
        organization: {
          name: organization.name,
          code: organization.code,
          subscription: organization.subscription
        },
        stats: {
          totalScholars,
          activeScholars,
          todayAttendance,
          attendanceRate,
          scholarLimit: organization.subscription.scholarLimit
        },
        weeklyTrend: weeklyAttendance,
        recentAttendance: recentAttendance.map(record => ({
          id: record._id,
          scholarId: record.scholarId?.scholarId,
          scholarName: record.scholarId?.personalInfo?.name,
          checkIn: record.checkIn?.timestamp,
          checkOut: record.checkOut?.timestamp,
          status: record.status
        }))
      });
    } catch (error) {
      logger.error('Dashboard data error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

// Get all scholars
router.get('/scholars', 
  authenticateToken, 
  requireRole('admin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, department, status } = req.query;
      const organizationId = req.user.organizationId;
      
      const query = { organizationId };
      
      if (search) {
        query.$or = [
          { scholarId: new RegExp(search, 'i') },
          { 'personalInfo.name': new RegExp(search, 'i') },
          { 'personalInfo.email': new RegExp(search, 'i') }
        ];
      }
      
      if (department) {
        query['academicInfo.department'] = department;
      }
      
      if (status) {
        query['status'] = status;
      }
      
      const scholars = await Scholar.find(query)
        .sort({ 'personalInfo.name': 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-biometricData.salts -biometricData.globalHash');
      
      const total = await Scholar.countDocuments(query);
      
      res.json({
        scholars,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get scholars error:', error);
      res.status(500).json({ error: 'Failed to fetch scholars' });
    }
  }
);

// Get attendance reports
router.get('/reports', 
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const organizationId = req.user.organizationId;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      const attendanceRecords = await AttendanceProof.find({
        organizationId,
        date: { $gte: start, $lte: end }
      })
      .populate('scholarId', 'scholarId personalInfo.name academicInfo.department')
      .sort({ date: -1 });
      
      if (format === 'csv') {
        // Generate CSV
        const csv = attendanceRecords.map(record => ({
          Date: record.date.toISOString().split('T')[0],
          ScholarID: record.scholarId?.scholarId,
          Name: record.scholarId?.personalInfo?.name,
          Department: record.scholarId?.academicInfo?.department,
          CheckIn: record.checkIn?.timestamp,
          CheckOut: record.checkOut?.timestamp,
          Status: record.status
        }));
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
        // Convert to CSV format (you might want to use a CSV library here)
        res.send(csv);
      } else {
        res.json({
          period: { start, end },
          totalRecords: attendanceRecords.length,
          records: attendanceRecords
        });
      }
    } catch (error) {
      logger.error('Generate report error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

// Analytics endpoint
router.get('/analytics',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.user.organizationId;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      // Daily attendance trend
      const dailyTrend = await AttendanceProof.aggregate([
        {
          $match: {
            organizationId: mongoose.Types.ObjectId(organizationId),
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }
          }
        },
        {
          $sort: { "_id": 1 }
        }
      ]);
      
      // Department-wise statistics
      const departmentStats = await AttendanceProof.aggregate([
        {
          $match: {
            organizationId: mongoose.Types.ObjectId(organizationId),
            date: { $gte: start, $lte: end }
          }
        },
        {
          $lookup: {
            from: 'scholars',
            localField: 'scholarId',
            foreignField: '_id',
            as: 'scholar'
          }
        },
        {
          $unwind: '$scholar'
        },
        {
          $group: {
            _id: '$scholar.academicInfo.department',
            totalDays: { $sum: 1 },
            presentDays: {
              $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
            },
            lateDays: {
              $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
            }
          }
        }
      ]);
      
      // Peak hours analysis
      const peakHours = await AttendanceProof.aggregate([
        {
          $match: {
            organizationId: mongoose.Types.ObjectId(organizationId),
            date: { $gte: start, $lte: end }
          }
        },
        {
          $project: {
            hour: { $hour: '$checkIn.timestamp' }
          }
        },
        {
          $group: {
            _id: '$hour',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      res.json({
        period: { startDate, endDate },
        dailyTrend,
        departmentStats,
        peakHours,
        generated: new Date()
      });
    } catch (error) {
      logger.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  }
);

export default router;