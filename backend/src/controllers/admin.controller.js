// backend/src/controllers/admin.controller.js
import Scholar from '../models/Scholar.js';
import Attendance from '../models/AttendanceProof.js';
import Organization from '../models/Organization.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

export class AdminController {
  // Get dashboard data
  async getDashboard(req, res) {
    try {
      const organizationId = req.user.organizationId;
      
      // Get organization details
      const organization = await Organization.findById(organizationId)
        .select('name code type address');

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get stats
      const totalScholars = await Scholar.countDocuments({ organizationId });
      
      const todayAttendance = await Attendance.find({
        organizationId,
        date: { $gte: today, $lt: tomorrow }
      });

      const presentToday = todayAttendance.length;
      const absentToday = totalScholars - presentToday;
      const attendanceRate = totalScholars > 0 ? 
        Math.round((presentToday / totalScholars) * 100) : 0;

      // Get recent activity
      const recentActivity = await Attendance.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('scholarId', 'personalInfo.name scholarId')
        .select('scholarId date checkIn checkOut proofData');

      res.json({
        success: true,
        organization,
        stats: {
          totalScholars,
          presentToday,
          absentToday,
          attendanceRate
        },
        recentActivity: recentActivity.map(activity => ({
          scholar: activity.scholarId?.personalInfo?.name || 'Unknown',
          scholarId: activity.scholarId?.scholarId,
          time: activity.date,
          checkIn: activity.checkIn?.timestamp,
          proofHash: activity.proofData?.verificationHash
        }))
      });
    } catch (error) {
      logger.error('Dashboard error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to load dashboard data' 
      });
    }
  }

  // Get dashboard stats only
  async getDashboardStats(req, res) {
    try {
      const organizationId = req.user.organizationId;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const totalScholars = await Scholar.countDocuments({ organizationId });
      const presentToday = await Attendance.countDocuments({
        organizationId,
        date: { $gte: today, $lt: tomorrow }
      });

      res.json({
        success: true,
        stats: {
          totalScholars,
          presentToday,
          absentToday: totalScholars - presentToday,
          attendanceRate: totalScholars > 0 ? 
            Math.round((presentToday / totalScholars) * 100) : 0
        }
      });
    } catch (error) {
      logger.error('Stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to load stats' 
      });
    }
  }

  // Get all scholars
  async getScholars(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const organizationId = req.user.organizationId;

      const query = { organizationId };
      if (search) {
        query.$or = [
          { 'personalInfo.name': { $regex: search, $options: 'i' } },
          { 'personalInfo.email': { $regex: search, $options: 'i' } },
          { 'scholarId': { $regex: search, $options: 'i' } }
        ];
      }

      const scholars = await Scholar.find(query)
        .select('-biometricData -credentials.passwordHash')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Scholar.countDocuments(query);

      res.json({
        success: true,
        scholars,
        pagination: {
          total,
          page: parseInt(page),
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
  }

  // Add new scholar - FIXED WITH PASSWORD HASHING
  async addScholar(req, res) {
    try {
      const organizationId = req.user.organizationId;
      
      // Check if scholar with same email already exists
      const existingScholar = await Scholar.findOne({
        'personalInfo.email': req.body.personalInfo.email
      });

      if (existingScholar) {
        return res.status(400).json({
          success: false,
          error: 'Scholar with this email already exists'
        });
      }

      // Check if scholarId already exists in organization
      const existingId = await Scholar.findOne({
        organizationId,
        scholarId: req.body.scholarId
      });

      if (existingId) {
        return res.status(400).json({
          success: false,
          error: 'Scholar ID already exists in your organization'
        });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      // Create scholar data with hashed password
      const scholarData = {
        scholarId: req.body.scholarId,
        organizationId,
        personalInfo: req.body.personalInfo,
        academicInfo: req.body.academicInfo,
        guardianInfo: req.body.guardianInfo,
        biometricData: req.body.biometricData,
        status: 'active',
        credentials: {
          passwordHash: hashedPassword,
          passwordChangedAt: new Date()
        },
        flags: {
          requirePasswordChange: true // Force password change on first login
        }
      };

      const scholar = new Scholar(scholarData);
      await scholar.save();

      logger.info(`New scholar added: ${scholar.personalInfo.email}`);

      res.status(201).json({
        success: true,
        message: 'Scholar added successfully',
        scholar: {
          id: scholar._id,
          name: scholar.personalInfo.name,
          email: scholar.personalInfo.email,
          scholarId: scholar.scholarId
        }
      });
    } catch (error) {
      logger.error('Add scholar error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get scholar by ID
  async getScholarById(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const scholar = await Scholar.findOne({ 
        _id: id, 
        organizationId 
      }).select('-biometricData -credentials');

      if (!scholar) {
        return res.status(404).json({ 
          success: false, 
          error: 'Scholar not found' 
        });
      }

      // Get attendance stats
      const attendanceStats = await Attendance.aggregate([
        { $match: { scholarId: scholar._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            lastAttendance: { $max: '$date' }
          }
        }
      ]);

      res.json({
        success: true,
        scholar,
        attendanceStats: attendanceStats[0] || { total: 0, lastAttendance: null }
      });
    } catch (error) {
      logger.error('Get scholar error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch scholar' 
      });
    }
  }

  // Update scholar
  async updateScholar(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      // Remove sensitive fields from update
      delete req.body.credentials;
      delete req.body.scholarId;
      delete req.body.organizationId;
      delete req.body.biometricData;

      const scholar = await Scholar.findOneAndUpdate(
        { _id: id, organizationId },
        { $set: req.body },
        { new: true, runValidators: true }
      ).select('-biometricData -credentials');

      if (!scholar) {
        return res.status(404).json({ 
          success: false, 
          error: 'Scholar not found' 
        });
      }

      res.json({
        success: true,
        message: 'Scholar updated successfully',
        scholar
      });
    } catch (error) {
      logger.error('Update scholar error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Delete scholar
  async deleteScholar(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const scholar = await Scholar.findOneAndDelete({ 
        _id: id, 
        organizationId 
      });

      if (!scholar) {
        return res.status(404).json({ 
          success: false, 
          error: 'Scholar not found' 
        });
      }

      // Delete related attendance records
      await Attendance.deleteMany({ scholarId: id });

      res.json({
        success: true,
        message: 'Scholar deleted successfully'
      });
    } catch (error) {
      logger.error('Delete scholar error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete scholar' 
      });
    }
  }

  // Get reports
  async getReports(req, res) {
    try {
      const { startDate, endDate, type = 'daily' } = req.query;
      const organizationId = req.user.organizationId;

      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const attendanceData = await Attendance.aggregate([
        { 
          $match: { 
            organizationId,
            ...(Object.keys(dateFilter).length && { date: dateFilter })
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { 
                format: type === 'monthly' ? '%Y-%m' : '%Y-%m-%d', 
                date: '$date' 
              }
            },
            count: { $sum: 1 },
            scholars: { $addToSet: '$scholarId' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        reports: attendanceData.map(item => ({
          date: item._id,
          present: item.count,
          uniqueScholars: item.scholars.length
        }))
      });
    } catch (error) {
      logger.error('Get reports error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate reports' 
      });
    }
  }

  // Get attendance report
  async getAttendanceReport(req, res) {
    try {
      const { date, scholarId } = req.query;
      const organizationId = req.user.organizationId;

      const query = { organizationId };
      
      if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        query.date = { $gte: startDate, $lt: endDate };
      }

      if (scholarId) {
        query.scholarId = scholarId;
      }

      const attendance = await Attendance.find(query)
        .populate('scholarId', 'personalInfo scholarId')
        .sort({ date: -1 });

      res.json({
        success: true,
        attendance: attendance.map(record => ({
          id: record._id,
          scholar: record.scholarId?.personalInfo,
          scholarId: record.scholarId?.scholarId,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          location: record.location,
          proofHash: record.proofData?.verificationHash
        }))
      });
    } catch (error) {
      logger.error('Attendance report error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get attendance report' 
      });
    }
  }

  // Export report
  async exportReport(req, res) {
    try {
      // This is a placeholder - implement CSV/PDF export logic
      res.json({
        success: true,
        message: 'Export functionality to be implemented'
      });
    } catch (error) {
      logger.error('Export error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to export report' 
      });
    }
  }

  // Get analytics
  async getAnalytics(req, res) {
    try {
      const organizationId = req.user.organizationId;
      
      // Last 30 days analytics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const analytics = await Attendance.aggregate([
        {
          $match: {
            organizationId,
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              hour: { $hour: '$checkIn.timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1, '_id.hour': 1 } }
      ]);

      // Peak hours
      const peakHours = await Attendance.aggregate([
        { $match: { organizationId } },
        {
          $group: {
            _id: { $hour: '$checkIn.timestamp' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      res.json({
        success: true,
        analytics: {
          dailyTrends: analytics,
          peakHours: peakHours.map(h => ({
            hour: h._id,
            count: h.count
          }))
        }
      });
    } catch (error) {
      logger.error('Analytics error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get analytics' 
      });
    }
  }

  // Get attendance trends
  async getAttendanceTrends(req, res) {
    try {
      const { period = '7d' } = req.query;
      const organizationId = req.user.organizationId;

      let dateFilter = new Date();
      switch (period) {
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
        case '90d':
          dateFilter.setDate(dateFilter.getDate() - 90);
          break;
        default:
          dateFilter.setDate(dateFilter.getDate() - 7);
      }

      const trends = await Attendance.aggregate([
        {
          $match: {
            organizationId,
            date: { $gte: dateFilter }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        trends
      });
    } catch (error) {
      logger.error('Trends error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get trends' 
      });
    }
  }

  // Get general stats
  async getStats(req, res) {
    try {
      const organizationId = req.user.organizationId;

      const [totalScholars, totalAttendance, activeScholars] = await Promise.all([
        Scholar.countDocuments({ organizationId }),
        Attendance.countDocuments({ organizationId }),
        Scholar.countDocuments({ 
          organizationId, 
          status: 'active' 
        })
      ]);

      res.json({
        success: true,
        stats: {
          totalScholars,
          activeScholars,
          totalAttendance,
          averageAttendancePerDay: totalAttendance > 0 ? 
            Math.round(totalAttendance / 30) : 0
        }
      });
    } catch (error) {
      logger.error('Stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get stats' 
      });
    }
  }
}