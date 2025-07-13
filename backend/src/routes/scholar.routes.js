// backend/src/routes/scholar.routes.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import Scholar from '../models/Scholar.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import Organization from '../models/Organization.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/scholar/register
// @desc    Register a new scholar (Admin only)
// @access  Private (Admin)
router.post('/register',
  authenticateToken,
  authorizeRoles(['admin', 'super_admin']), // Changed to allow admin roles
  [
    body('scholarId').notEmpty().trim().toUpperCase(),
    body('personalInfo.name').notEmpty().trim(),
    body('personalInfo.email').isEmail().normalizeEmail(),
    body('personalInfo.phone').isMobilePhone(),
    body('password').isLength({ min: 8 }),
    body('academicInfo.department').notEmpty(),
    body('academicInfo.course').notEmpty(),
    body('academicInfo.year').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        scholarId,
        personalInfo,
        academicInfo,
        password,
        biometrics,
        organizationId
      } = req.body;

      logger.info(`Registering new scholar: ${scholarId}`);

      // Use the organizationId from the request or from the admin's organization
      const orgId = organizationId || req.user.organizationId;

      // Check if scholar already exists
      const existingScholar = await Scholar.findOne({
        $or: [
          { scholarId: scholarId },
          { 'personalInfo.email': personalInfo.email }
        ]
      });

      if (existingScholar) {
        return res.status(409).json({
          success: false,
          error: 'Scholar with this ID or email already exists'
        });
      }

      // Check biometric uniqueness if provided
      if (biometrics) {
        if (biometrics.faceCommitment) {
          const faceExists = await BiometricCommitment.findByHash(
            biometrics.faceCommitment.commitment
          );
          if (faceExists) {
            return res.status(409).json({
              success: false,
              error: 'Face biometric already registered'
            });
          }
        }

        if (biometrics.fingerprintCommitment) {
          const fingerprintExists = await BiometricCommitment.findByHash(
            biometrics.fingerprintCommitment.commitment
          );
          if (fingerprintExists) {
            return res.status(409).json({
              success: false,
              error: 'Fingerprint biometric already registered'
            });
          }
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new scholar
      const newScholar = new Scholar({
        scholarId: scholarId.toUpperCase(),
        personalInfo,
        academicInfo,
        organizationId: orgId,
        credentials: {
          passwordHash: hashedPassword
        },
        biometrics: biometrics || {},
        status: 'active'
      });

      await newScholar.save();

      // If biometrics provided, create biometric commitment record
      if (biometrics && (biometrics.faceCommitment || biometrics.fingerprintCommitment)) {
        const biometricCommitment = new BiometricCommitment({
          userId: newScholar._id,
          userType: 'scholar',
          organizationId: orgId,
          commitments: {
            face: biometrics.faceCommitment ? {
              commitment: biometrics.faceCommitment.commitment,
              hash: biometrics.faceCommitment.commitment,
              timestamp: new Date()
            } : undefined,
            fingerprint: biometrics.fingerprintCommitment ? {
              commitment: biometrics.fingerprintCommitment.commitment,
              hash: biometrics.fingerprintCommitment.commitment,
              timestamp: new Date()
            } : undefined
          }
        });

        await biometricCommitment.save();
      }

      logger.info(`Scholar registered successfully: ${scholarId}`);

      res.status(201).json({
        success: true,
        message: 'Scholar registered successfully',
        scholar: {
          id: newScholar._id,
          scholarId: newScholar.scholarId,
          name: newScholar.personalInfo.name,
          email: newScholar.personalInfo.email,
          department: newScholar.academicInfo.department
        }
      });

    } catch (error) {
      logger.error('Scholar registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register scholar',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/scholar/profile
// @desc    Get scholar profile
// @access  Private (Scholar)
router.get('/profile',
  authenticateToken,
  authorizeRoles(['scholar']),
  async (req, res) => {
    try {
      const scholar = await Scholar.findById(req.user.id)
        .select('-credentials.passwordHash')
        .populate('organizationId', 'name code type');

      if (!scholar) {
        return res.status(404).json({
          success: false,
          error: 'Scholar not found'
        });
      }

      res.json({
        success: true,
        profile: scholar
      });
    } catch (error) {
      logger.error('Get scholar profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }
);

// @route   PUT /api/scholar/profile
// @desc    Update scholar profile
// @access  Private (Scholar)
router.put('/profile',
  authenticateToken,
  authorizeRoles(['scholar']),
  [
    body('personalInfo.phone').optional().isMobilePhone(),
    body('personalInfo.address').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const updates = req.body;

      // Prevent updating sensitive fields
      delete updates.scholarId;
      delete updates.credentials;
      delete updates.organizationId;
      delete updates.biometrics;

      const scholar = await Scholar.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-credentials.passwordHash');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: scholar
      });
    } catch (error) {
      logger.error('Update scholar profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

// @route   GET /api/scholar/stats
// @desc    Get scholar attendance statistics
// @access  Private (Scholar)
router.get('/stats',
  authenticateToken,
  authorizeRoles(['scholar']),
  async (req, res) => {
    try {
      const scholar = await Scholar.findById(req.user.id)
        .select('attendanceStats');

      res.json({
        success: true,
        stats: scholar.attendanceStats
      });
    } catch (error) {
      logger.error('Get scholar stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }
);

// @route   GET /api/scholar/attendance/history
// @desc    Get scholar's attendance history
// @access  Private (Scholar)
router.get('/attendance/history',
  authenticateToken,
  authorizeRoles(['scholar']),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, month, year } = req.query;

      // This would typically fetch from an Attendance collection
      // For now, returning mock data
      res.json({
        success: true,
        attendance: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalRecords: 0,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Get attendance history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get attendance history'
      });
    }
  }
);

// @route   GET /api/scholar/attendance/today
// @desc    Get today's attendance
// @access  Private (Scholar)
router.get('/attendance/today', 
  authenticateToken, 
  requireRole('scholar'), 
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await AttendanceRecord.findOne({
        scholar: req.user.id,
        markedAt: { $gte: today, $lt: tomorrow }
      });

      res.json({
        success: true,
        attendance: attendance ? {
          id: attendance._id,
          markedAt: attendance.markedAt,
          status: attendance.status,
          proofId: attendance.proofId,
          locationValid: attendance.locationValid,
          verificationMethod: attendance.verificationMethod,
          timestamp: attendance.markedAt
        } : null
      });

    } catch (error) {
      logger.error('Get today attendance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch today\'s attendance'
      });
    }
  }
);

// @route   POST /api/scholar/change-password
// @desc    Change scholar password
// @access  Private (Scholar)
router.post('/change-password',
  authenticateToken,
  authorizeRoles(['scholar']),
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const scholar = await Scholar.findById(req.user.id);

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, scholar.credentials.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      scholar.credentials.passwordHash = hashedPassword;
      scholar.credentials.passwordChangedAt = new Date();
      await scholar.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }
);

// @route   POST /api/scholar/self-register
// @desc    Scholar self-registration with organization code
// @access  Public
router.post('/self-register',
  [
    body('organizationCode').notEmpty().trim().toUpperCase(),
    body('personalInfo.name').notEmpty().trim(),
    body('personalInfo.email').isEmail().normalizeEmail(),
    body('personalInfo.phone').isMobilePhone(),
    body('personalInfo.scholarId').notEmpty().trim(),
    body('password').isLength({ min: 8 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        organizationCode,
        personalInfo,
        academicInfo,
        password,
        biometrics
      } = req.body;

      // Find organization by code
      const organization = await Organization.findOne({ code: organizationCode });
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: 'Invalid organization code'
        });
      }

      // Check if scholar already exists
      const existingScholar = await Scholar.findOne({
        $or: [
          { scholarId: personalInfo.scholarId },
          { 'personalInfo.email': personalInfo.email }
        ]
      });

      if (existingScholar) {
        return res.status(409).json({
          success: false,
          error: 'Scholar with this ID or email already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new scholar
      const newScholar = new Scholar({
        scholarId: personalInfo.scholarId.toUpperCase(),
        personalInfo,
        academicInfo: academicInfo || {},
        organizationId: organization._id,
        credentials: {
          passwordHash: hashedPassword
        },
        biometrics: biometrics || {},
        status: 'pending_approval' // Requires admin approval
      });

      await newScholar.save();

      res.status(201).json({
        success: true,
        message: 'Registration successful. Awaiting admin approval.',
        scholar: {
          id: newScholar._id,
          scholarId: newScholar.scholarId,
          name: newScholar.personalInfo.name,
          email: newScholar.personalInfo.email,
          status: newScholar.status
        }
      });

    } catch (error) {
      logger.error('Scholar self-registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;