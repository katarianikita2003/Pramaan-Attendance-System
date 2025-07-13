// backend/src/routes/admin.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { AdminController } from '../controllers/admin.controller.js';
import Scholar from '../models/Scholar.js';
import logger from '../utils/logger.js';

const router = express.Router();
const adminController = new AdminController();

// All routes require authentication
router.use(authenticateToken);

// Dashboard routes
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard-stats', adminController.getDashboardStats);

// Scholar management routes
router.get('/scholars', adminController.getScholars);

// Enhanced POST route for adding scholars with proper validation and isActive field
router.post('/scholars', 
  [
    body('scholarId').notEmpty().trim(),
    body('personalInfo.name').notEmpty().trim(),
    body('personalInfo.email').isEmail().normalizeEmail(),
    body('personalInfo.phone').notEmpty(),
    body('password').isLength({ min: 8 }),
    body('academicInfo.department').notEmpty(),
    body('academicInfo.course').notEmpty(),
    body('academicInfo.year').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scholarId, personalInfo, academicInfo, password, guardianInfo, biometrics } = req.body;
      const organizationId = req.user.organizationId;

      logger.info(`Admin creating scholar: ${scholarId}`);

      // Check if scholar already exists
      const existingScholar = await Scholar.findOne({
        $or: [
          { scholarId: scholarId.toUpperCase() },
          { 'personalInfo.email': personalInfo.email }
        ]
      });

      if (existingScholar) {
        return res.status(400).json({ 
          message: 'Scholar with this ID or email already exists' 
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new scholar with all required fields
      const newScholar = new Scholar({
        scholarId: scholarId.toUpperCase(),
        personalInfo: {
          ...personalInfo,
          email: personalInfo.email.toLowerCase()
        },
        academicInfo,
        organizationId,
        credentials: {
          passwordHash: hashedPassword
        },
        guardianInfo: guardianInfo || {},
        biometrics: biometrics || {},
        isActive: true,  // Explicitly set to true
        status: 'active', // Explicitly set to active
        attendanceStats: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          percentage: 0
        },
        settings: {
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          privacy: {
            showEmail: false,
            showPhone: false
          }
        }
      });

      await newScholar.save();

      logger.info(`Scholar created successfully: ${newScholar.scholarId}`);

      res.status(201).json({
        message: 'Scholar added successfully',
        scholar: {
          id: newScholar._id,
          scholarId: newScholar.scholarId,
          name: newScholar.personalInfo.name,
          email: newScholar.personalInfo.email
        }
      });

    } catch (error) {
      logger.error('Error adding scholar:', error);
      res.status(500).json({ message: 'Failed to add scholar', error: error.message });
    }
  }
);

router.get('/scholars/:id', adminController.getScholarById);
router.put('/scholars/:id', adminController.updateScholar);
router.delete('/scholars/:id', adminController.deleteScholar);

// Reports routes
router.get('/reports', adminController.getReports);
router.get('/reports/attendance', adminController.getAttendanceReport);
router.get('/reports/export', adminController.exportReport);

// Analytics routes
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/trends', adminController.getAttendanceTrends);

// General stats
router.get('/stats', adminController.getStats);

export default router;