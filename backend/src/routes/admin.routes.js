// backend/src/routes/admin.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { AdminController } from '../controllers/admin.controller.js';
import Scholar from '../models/Scholar.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

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
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { scholarId, personalInfo, academicInfo, password, guardianInfo, biometricData } = req.body;
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
          success: false,
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
        biometrics: {
          isEnrolled: false,
          enrolledAt: null,
          faceEnrolled: false,
          fingerprintEnrolled: false
        },
        isActive: true,
        status: 'active',
        attendanceStats: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          percentage: 0
        },
        activity: {
          lastLogin: null,
          lastAttendance: null
        }
      });

      await newScholar.save();

      // If biometric data is provided, create biometric commitment
      if (biometricData && (biometricData.faceCommitment || biometricData.fingerprintCommitment)) {
        try {
          const commitments = {};

          if (biometricData.faceCommitment) {
            const hash = crypto.createHash('sha256')
              .update(biometricData.faceCommitment)
              .digest('hex');
            
            commitments.face = {
              commitment: biometricData.faceCommitment,
              hash: hash,
              timestamp: new Date()
            };
          }

          if (biometricData.fingerprintCommitment) {
            const hash = crypto.createHash('sha256')
              .update(biometricData.fingerprintCommitment)
              .digest('hex');
            
            commitments.fingerprint = {
              commitment: biometricData.fingerprintCommitment,
              hash: hash,
              timestamp: new Date()
            };
          }

          const biometricCommitment = new BiometricCommitment({
            userId: newScholar._id,
            userType: 'scholar',
            organizationId,
            commitments
          });

          await biometricCommitment.save();

          // Update scholar biometric status
          newScholar.biometrics = {
            isEnrolled: true,
            enrolledAt: new Date(),
            faceEnrolled: !!biometricData.faceCommitment,
            fingerprintEnrolled: !!biometricData.fingerprintCommitment
          };
          await newScholar.save();

        } catch (biometricError) {
          logger.error('Error saving biometric commitment:', biometricError);
          // Don't fail the entire registration if biometric save fails
        }
      }

      logger.info(`Scholar created successfully: ${newScholar.scholarId}`);

      res.status(201).json({
        success: true,
        message: 'Scholar added successfully',
        scholar: {
          id: newScholar._id,
          scholarId: newScholar.scholarId,
          name: newScholar.personalInfo.name,
          email: newScholar.personalInfo.email,
          department: newScholar.academicInfo.department,
          biometricsEnrolled: newScholar.biometrics.isEnrolled
        }
      });

    } catch (error) {
      logger.error('Error adding scholar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add scholar',
        error: error.message
      });
    }
  }
);

router.get('/scholars/:id', adminController.getScholarById);
router.put('/scholars/:id', adminController.updateScholar);
router.delete('/scholars/:id', adminController.deleteScholar);

// Reports routes
router.get('/reports', adminController.getReports);
router.get('/reports/attendance', adminController.getAttendanceReports);
router.get('/reports/export', adminController.exportReports);

// Analytics route
router.get('/analytics', adminController.getAnalytics);

// Settings routes (if you have these methods)
// router.get('/settings', adminController.getSettings);
// router.put('/settings', adminController.updateSettings);

export default router;

// // backend/src/routes/admin.routes.js
// import express from 'express';
// import bcrypt from 'bcryptjs';
// import { body, validationResult } from 'express-validator';
// import { authenticateToken } from '../middleware/auth.middleware.js';
// import { AdminController } from '../controllers/admin.controller.js';
// import Scholar from '../models/Scholar.js';
// import BiometricCommitment from '../models/BiometricCommitment.js';
// import logger from '../utils/logger.js';

// const router = express.Router();
// const adminController = new AdminController();

// // All routes require authentication
// router.use(authenticateToken);

// // Dashboard routes
// router.get('/dashboard', adminController.getDashboard);
// router.get('/dashboard-stats', adminController.getDashboardStats);

// // Scholar management routes
// router.get('/scholars', adminController.getScholars);

// // Enhanced POST route for adding scholars with proper validation and isActive field
// router.post('/scholars', 
//   [
//     body('scholarId').notEmpty().trim(),
//     body('personalInfo.name').notEmpty().trim(),
//     body('personalInfo.email').isEmail().normalizeEmail(),
//     body('personalInfo.phone').notEmpty(),
//     body('password').isLength({ min: 8 }),
//     body('academicInfo.department').notEmpty(),
//     body('academicInfo.course').notEmpty(),
//     body('academicInfo.year').notEmpty()
//   ],
//   async (req, res) => {
//     try {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//       }

//       const { scholarId, personalInfo, academicInfo, password, guardianInfo, biometrics } = req.body;
//       const organizationId = req.user.organizationId;

//       logger.info(`Admin creating scholar: ${scholarId}`);

//       // Check if scholar already exists
//       const existingScholar = await Scholar.findOne({
//         $or: [
//           { scholarId: scholarId.toUpperCase() },
//           { 'personalInfo.email': personalInfo.email }
//         ]
//       });

//       if (existingScholar) {
//         return res.status(400).json({ 
//           message: 'Scholar with this ID or email already exists' 
//         });
//       }

//       // Check biometric uniqueness if provided
//       if (biometrics) {
//         if (biometrics.faceCommitment) {
//           const faceExists = await BiometricCommitment.findByHash(
//             biometrics.faceCommitment,
//             'face'
//           );
//           if (faceExists) {
//             return res.status(409).json({
//               success: false,
//               error: 'Face biometric already registered in the system',
//               message: 'This face biometric is already associated with another account'
//             });
//           }
//         }

//         if (biometrics.fingerprintCommitment) {
//           const fingerprintExists = await BiometricCommitment.findByHash(
//             biometrics.fingerprintCommitment,
//             'fingerprint'
//           );
//           if (fingerprintExists) {
//             return res.status(409).json({
//               success: false,
//               error: 'Fingerprint biometric already registered in the system',
//               message: 'This fingerprint biometric is already associated with another account'
//             });
//           }
//         }
//       }

//       // Hash password
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);

//       // Create new scholar with all required fields
//       const newScholar = new Scholar({
//         scholarId: scholarId.toUpperCase(),
//         personalInfo: {
//           ...personalInfo,
//           email: personalInfo.email.toLowerCase()
//         },
//         academicInfo,
//         organizationId,
//         credentials: {
//           passwordHash: hashedPassword
//         },
//         guardianInfo: guardianInfo || {},
//         biometrics: {
//           isEnrolled: !!(biometrics?.faceCommitment || biometrics?.fingerprintCommitment),
//           enrolledAt: biometrics ? new Date() : undefined,
//           faceEnrolled: !!biometrics?.faceCommitment,
//           fingerprintEnrolled: !!biometrics?.fingerprintCommitment,
//           // Store the commitment strings directly
//           faceCommitment: biometrics?.faceCommitment || undefined,
//           fingerprintCommitment: biometrics?.fingerprintCommitment || undefined,
//           registeredAt: biometrics ? new Date() : undefined
//         },
//         isActive: true,
//         status: 'active',
//         attendanceStats: {
//           totalDays: 0,
//           presentDays: 0,
//           absentDays: 0,
//           percentage: 0
//         },
//         activity: {
//           lastLogin: null,
//           lastAttendance: null,
//           totalLogins: 0
//         }
//       });

//       await newScholar.save();

//       // If biometrics provided, create biometric commitment record
//       if (biometrics && (biometrics.faceCommitment || biometrics.fingerprintCommitment)) {
//         const biometricCommitment = new BiometricCommitment({
//           userId: newScholar._id,
//           userType: 'scholar',
//           organizationId: organizationId,
//           commitments: {
//             face: biometrics.faceCommitment ? {
//               commitment: biometrics.faceCommitment,
//               hash: biometrics.faceCommitment, // In production, this should be a proper hash
//               timestamp: new Date()
//             } : undefined,
//             fingerprint: biometrics.fingerprintCommitment ? {
//               commitment: biometrics.fingerprintCommitment,
//               hash: biometrics.fingerprintCommitment, // In production, this should be a proper hash
//               timestamp: new Date()
//             } : undefined
//           }
//         });

//         await biometricCommitment.save();
//       }

//       logger.info(`Scholar created successfully: ${scholarId}`);

//       res.status(201).json({
//         message: 'Scholar added successfully',
//         scholar: {
//           id: newScholar._id,
//           scholarId: newScholar.scholarId,
//           name: newScholar.personalInfo.name,
//           email: newScholar.personalInfo.email,
//           status: newScholar.status
//         }
//       });

//     } catch (error) {
//       logger.error('Error adding scholar:', error);
//       res.status(500).json({ 
//         message: 'Failed to add scholar',
//         error: error.message 
//       });
//     }
//   }
// );

// // Get scholar by ID (add this method if missing)
// router.get('/scholars/:id', adminController.getScholarById ? adminController.getScholarById : async (req, res) => {
//   try {
//     const { id } = req.params;
//     const organizationId = req.user.organizationId;

//     const scholar = await Scholar.findOne({ 
//       _id: id, 
//       organizationId 
//     }).select('-credentials.passwordHash');

//     if (!scholar) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Scholar not found' 
//       });
//     }

//     res.json({
//       success: true,
//       scholar
//     });
//   } catch (error) {
//     logger.error('Get scholar error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch scholar' 
//     });
//   }
// });

// // Update scholar
// router.put('/scholars/:id', adminController.updateScholar ? adminController.updateScholar : async (req, res) => {
//   try {
//     const { id } = req.params;
//     const organizationId = req.user.organizationId;
//     const updateData = req.body;

//     // Remove sensitive fields
//     delete updateData.scholarId;
//     delete updateData.organizationId;
//     delete updateData.credentials;
//     delete updateData.biometrics;

//     const scholar = await Scholar.findOneAndUpdate(
//       { _id: id, organizationId },
//       { $set: updateData },
//       { new: true, runValidators: true }
//     ).select('-credentials.passwordHash');

//     if (!scholar) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Scholar not found' 
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Scholar updated successfully',
//       scholar
//     });
//   } catch (error) {
//     logger.error('Update scholar error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to update scholar' 
//     });
//   }
// });

// // Delete scholar
// router.delete('/scholars/:id', adminController.deleteScholar ? adminController.deleteScholar : async (req, res) => {
//   try {
//     const { id } = req.params;
//     const organizationId = req.user.organizationId;

//     const scholar = await Scholar.findOneAndDelete({ 
//       _id: id, 
//       organizationId 
//     });

//     if (!scholar) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Scholar not found' 
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Scholar deleted successfully'
//     });
//   } catch (error) {
//     logger.error('Delete scholar error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to delete scholar' 
//     });
//   }
// });

// // Organization routes
// router.get('/organization', adminController.getOrganizationDetails ? adminController.getOrganizationDetails : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// router.put('/organization', adminController.updateOrganizationSettings ? adminController.updateOrganizationSettings : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// // Attendance routes
// router.get('/attendance', adminController.getAttendanceRecords ? adminController.getAttendanceRecords : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// router.get('/attendance/today', adminController.getTodayAttendance ? adminController.getTodayAttendance : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// router.get('/attendance/stats', adminController.getAttendanceStats ? adminController.getAttendanceStats : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// // Reports routes
// router.get('/reports/attendance', adminController.generateAttendanceReport ? adminController.generateAttendanceReport : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// router.get('/reports/scholars', adminController.generateScholarReport ? adminController.generateScholarReport : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// // Analytics routes
// router.get('/analytics', adminController.getAnalytics ? adminController.getAnalytics : async (req, res) => {
//   try {
//     const organizationId = req.user.organizationId;
    
//     // Return empty analytics for now
//     res.json({
//       success: true,
//       analytics: {
//         dailyTrends: [],
//         peakHours: [],
//         monthlyStats: {
//           attendance: 0,
//           avgCheckInTime: null,
//           lateArrivals: 0
//         }
//       }
//     });
//   } catch (error) {
//     logger.error('Get analytics error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch analytics' 
//     });
//   }
// });

// router.get('/analytics/trends', adminController.getAttendanceTrends ? adminController.getAttendanceTrends : async (req, res) => {
//   res.status(501).json({ success: false, error: 'Not implemented' });
// });

// export default router;