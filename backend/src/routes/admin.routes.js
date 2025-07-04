// ===== backend/src/routes/admin.routes.js =====
import express from 'express';
import Organization from '../models/Organization.js';
import Scholar from '../models/Scholar.js';
import AttendanceProof from '../models/AttendanceProof.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { CertificateService } from '../services/certificate.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const certificateService = new CertificateService();

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
        query['status.isActive'] = status === 'active';
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

// Get daily report
router.get('/reports/daily',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      const organizationId = req.user.organizationId;
      
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Get attendance statistics
      const stats = await AttendanceProof.aggregate([
        {
          $match: {
            organizationId: mongoose.Types.ObjectId(organizationId),
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            scholars: { $push: '$scholarId' }
          }
        }
      ]);
      
      // Get detailed attendance records
      const attendance = await AttendanceProof.find({
        organizationId,
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('scholarId', 'scholarId personalInfo.name academicInfo.department')
      .sort({ 'checkIn.timestamp': 1 });
      
      // Calculate summary
      const summary = {
        date,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0
      };
      
      stats.forEach(stat => {
        summary[stat._id] = stat.count;
        summary.total += stat.count;
      });
      
      // Get absent scholars
      const allScholars = await Scholar.find({ 
        organizationId, 
        'status.isActive': true 
      }).select('_id');
      
      const presentScholarIds = attendance.map(a => a.scholarId._id.toString());
      const absentScholars = allScholars.filter(
        s => !presentScholarIds.includes(s._id.toString())
      );
      
      summary.absent = absentScholars.length;
      
      res.json({
        summary,
        attendance: attendance.map(record => ({
          scholar: {
            id: record.scholarId._id,
            scholarId: record.scholarId.scholarId,
            name: record.scholarId.personalInfo.name,
            department: record.scholarId.academicInfo.department
          },
          checkIn: record.checkIn?.timestamp,
          checkOut: record.checkOut?.timestamp,
          duration: record.duration,
          status: record.status,
          flags: record.flags
        })),
        absentCount: summary.absent
      });
    } catch (error) {
      logger.error('Daily report error:', error);
      res.status(500).json({ error: 'Failed to generate daily report' });
    }
  }
);

// Get attendance analytics
router.get('/analytics/attendance',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.user.organizationId;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Start date and end date are required' 
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
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