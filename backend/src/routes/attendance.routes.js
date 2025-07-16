// backend/src/routes/attendance.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
// Import from the existing controller first
import {
  markAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  verifyAttendanceProof,
  getAttendanceStats
} from '../controllers/attendanceController.js';
// Import enhanced functions
import enhancedAttendanceController from '../controllers/attendance.controller.enhanced.js';

const router = express.Router();

// Keep existing routes working
router.post('/mark', authenticateToken, authorizeRoles(['scholar']), markAttendance);
router.get('/today', authenticateToken, authorizeRoles(['scholar']), getTodayAttendance);
router.get('/history', authenticateToken, authorizeRoles(['scholar']), getAttendanceHistory);
router.get('/stats', authenticateToken, authorizeRoles(['scholar']), getAttendanceStats);

// Add new enhanced routes
router.post('/generate-proof', authenticateToken, authorizeRoles(['scholar']), enhancedAttendanceController.generateAttendanceProof);
router.get('/today-status', authenticateToken, authorizeRoles(['scholar']), enhancedAttendanceController.getTodayStatus);
router.post('/verify-qr', authenticateToken, authorizeRoles(['admin']), enhancedAttendanceController.verifyQRAttendance);

// Public verification route
router.get('/verify/:proofId', verifyAttendanceProof);

// Admin routes
router.get('/organization/:organizationId', 
  authenticateToken, 
  authorizeRoles(['admin', 'super_admin']), 
  async (req, res) => {
    // Implementation for getting organization-wide attendance
    res.json({ success: true, attendance: [] });
  }
);

export default router;


// // backend/src/routes/attendance.routes.js
// import express from 'express';
// import { authenticateToken } from '../middleware/auth.middleware.js';
// import { authorizeRoles } from '../middleware/role.middleware.js';
// import {
//   markAttendance,
//   getTodayAttendance,
//   getAttendanceHistory,
//   verifyAttendanceProof,
//   getAttendanceStats
// } from '../controllers/attendanceController.js';

// const router = express.Router();

// // Scholar routes
// router.post('/mark', authenticateToken, authorizeRoles(['scholar']), markAttendance);
// router.get('/today', authenticateToken, authorizeRoles(['scholar']), getTodayAttendance);
// router.get('/history', authenticateToken, authorizeRoles(['scholar']), getAttendanceHistory);
// router.get('/stats', authenticateToken, authorizeRoles(['scholar']), getAttendanceStats);

// // Public verification route
// router.get('/verify/:proofId', verifyAttendanceProof);

// // Admin routes
// router.get('/organization/:organizationId', 
//   authenticateToken, 
//   authorizeRoles(['admin', 'super_admin']), 
//   async (req, res) => {
//     // Implementation for getting organization-wide attendance
//     res.json({ success: true, attendance: [] });
//   }
// );

// export default router;

// // // backend/src/routes/attendance.routes.js
// // import express from 'express';
// // import mongoose from 'mongoose';
// // import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
// // import AttendanceRecord from '../models/AttendanceRecord.js';
// // import Scholar from '../models/Scholar.js';
// // import Campus from '../models/Campus.js';
// // import BiometricCommitment from '../models/BiometricCommitment.js';
// // import SecurityLog from '../models/SecurityLog.js';
// // import { zkpService } from '../services/zkp.service.js';
// // import logger from '../utils/logger.js';

// // const router = express.Router();

// // // Mark attendance - for scholars with biometric verification
// // router.post('/mark', authenticateToken, requireRole('scholar'), async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();
  
// //   try {
// //     const { 
// //       scholarId, 
// //       location, 
// //       biometricType, 
// //       biometricCommitment, // The commitment generated from current biometric
// //       biometricProof, // ZKP proof that this is the same biometric as registration
// //       timestamp 
// //     } = req.body;
    
// //     // Verify the scholar is marking their own attendance
// //     if (req.user.scholarId !== scholarId) {
// //       await session.abortTransaction();
// //       return res.status(403).json({
// //         success: false,
// //         error: 'Unauthorized to mark attendance for another scholar',
// //         code: 'UNAUTHORIZED_ACCESS'
// //       });
// //     }

// //     // Get scholar details
// //     const scholar = await Scholar.findById(req.user.id).populate('organizationId').session(session);
// //     if (!scholar) {
// //       await session.abortTransaction();
// //       return res.status(404).json({
// //         success: false,
// //         error: 'Scholar not found',
// //         code: 'SCHOLAR_NOT_FOUND'
// //       });
// //     }

// //     // CRITICAL: Verify biometric matches registration
// //     if (!biometricCommitment) {
// //       await session.abortTransaction();
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Biometric verification is required to mark attendance',
// //         code: 'BIOMETRIC_REQUIRED'
// //       });
// //     }

// //     // Find the registered biometric commitment
// //     const biometricCommitmentRecord = await BiometricCommitment.findOne({
// //       scholar: scholar._id,
// //       type: biometricType,
// //       status: 'active'
// //     }).session(session);

// //     if (!biometricCommitmentRecord) {
// //       await session.abortTransaction();
// //       return res.status(403).json({
// //         success: false,
// //         error: `No registered ${biometricType} biometric found. Please contact admin to register your biometric.`,
// //         code: 'BIOMETRIC_NOT_REGISTERED'
// //       });
// //     }

// //     // Verify the provided biometric matches the registered one
// //     const isValidBiometric = await biometricCommitmentRecord.verifyBiometric(biometricCommitment, biometricProof);
    
// //     if (!isValidBiometric) {
// //       logger.warn(`Biometric mismatch for scholar ${scholarId}. Possible fraud attempt.`);
      
// //       // Log security event
// //       await SecurityLog.create({
// //         type: 'BIOMETRIC_MISMATCH',
// //         severity: 'high',
// //         scholar: scholar._id,
// //         organization: scholar.organizationId,
// //         details: {
// //           providedCommitment: biometricCommitment.substring(0, 16) + '...', // Log only partial
// //           biometricType,
// //           location,
// //           timestamp: new Date(),
// //           ipAddress: req.ip,
// //           userAgent: req.headers['user-agent']
// //         }
// //       }, { session });

// //       await session.abortTransaction();
// //       return res.status(403).json({
// //         success: false,
// //         error: 'Biometric verification failed. You must use the same biometric that was registered.',
// //         code: 'BIOMETRIC_VERIFICATION_FAILED'
// //       });
// //     }

// //     // Verify ZKP proof if provided (mandatory in production)
// //     if (biometricProof && zkpService.isInitialized()) {
// //       const proofValid = await zkpService.verifyBiometricProof({
// //         proof: biometricProof,
// //         commitment: biometricCommitment,
// //         scholarId: scholar.scholarId,
// //         timestamp
// //       });

// //       if (!proofValid) {
// //         await session.abortTransaction();
// //         return res.status(403).json({
// //           success: false,
// //           error: 'Invalid biometric proof',
// //           code: 'INVALID_ZKP_PROOF'
// //         });
// //       }
// //     }

// //     // Check if attendance already marked today
// //     const today = new Date();
// //     today.setHours(0, 0, 0, 0);
// //     const tomorrow = new Date(today);
// //     tomorrow.setDate(tomorrow.getDate() + 1);

// //     const existingAttendance = await AttendanceRecord.findOne({
// //       scholar: req.user.id,
// //       markedAt: { $gte: today, $lt: tomorrow }
// //     }).session(session);

// //     if (existingAttendance) {
// //       await session.abortTransaction();
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Attendance already marked for today',
// //         code: 'ATTENDANCE_ALREADY_MARKED',
// //         attendance: {
// //           markedAt: existingAttendance.markedAt,
// //           proofId: existingAttendance.proofId
// //         }
// //       });
// //     }

// //     // Verify location
// //     const campus = await Campus.findOne({ organization: scholar.organizationId }).session(session);
// //     let locationValid = true;
    
// //     if (campus && campus.boundaries && location) {
// //       locationValid = campus.isLocationWithinBoundaries(
// //         location.latitude,
// //         location.longitude
// //       );
      
// //       // Check if location is required
// //       if (!locationValid && campus.attendanceSettings?.requireLocation) {
// //         await session.abortTransaction();
// //         return res.status(403).json({
// //           success: false,
// //           error: 'You must be within campus boundaries to mark attendance',
// //           code: 'LOCATION_OUTSIDE_CAMPUS',
// //           distance: calculateDistance(
// //             location.latitude,
// //             location.longitude,
// //             campus.boundaries.center.lat,
// //             campus.boundaries.center.lng
// //           )
// //         });
// //       }
// //     }

// //     // Check if campus is open
// //     if (campus && !campus.isOpenAt(new Date())) {
// //       logger.warn(`Attendance attempt outside operating hours by scholar ${scholarId}`);
// //       // You might want to allow this with a warning or reject it
// //     }

// //     // Generate attendance ZKP proof
// //     let zkpProof;
// //     let proofId;
    
// //     try {
// //       const proofData = await zkpService.generateAttendanceProof({
// //         scholarId: scholar.scholarId,
// //         biometricCommitment: biometricCommitmentRecord.commitment,
// //         timestamp: new Date().toISOString(),
// //         location: location,
// //         biometricVerified: true,
// //         nullifier: biometricCommitmentRecord.nullifier
// //       });
      
// //       zkpProof = proofData.proof;
// //       proofId = proofData.proofId;
// //     } catch (zkpError) {
// //       logger.error('ZKP generation error:', zkpError);
// //       await session.abortTransaction();
// //       return res.status(500).json({
// //         success: false,
// //         error: 'Failed to generate attendance proof',
// //         code: 'ZKP_GENERATION_FAILED'
// //       });
// //     }

// //     // Create attendance record
// //     const attendanceRecord = new AttendanceRecord({
// //       scholar: scholar._id,
// //       organization: scholar.organizationId,
// //       markedAt: new Date(),
// //       location: location ? {
// //         type: 'Point',
// //         coordinates: [location.longitude, location.latitude]
// //       } : undefined,
// //       locationValid,
// //       biometricType,
// //       biometricCommitment: biometricCommitmentRecord._id, // Reference to commitment record
// //       zkpProof,
// //       proofId,
// //       status: 'present',
// //       verificationMethod: 'zkp_biometric',
// //       deviceInfo: {
// //         deviceId: req.body.deviceId,
// //         platform: req.body.platform,
// //         appVersion: req.body.appVersion
// //       },
// //       metadata: {
// //         ipAddress: req.ip,
// //         userAgent: req.headers['user-agent'],
// //         sessionId: req.sessionID
// //       }
// //     });

// //     await attendanceRecord.save({ session });

// //     // Update scholar stats
// //     await Scholar.findByIdAndUpdate(
// //       scholar._id,
// //       {
// //         $inc: { 'stats.totalPresent': 1 },
// //         $set: { 'stats.lastAttendance': new Date() }
// //       },
// //       { session }
// //     );

// //     // Log successful attendance
// //     await SecurityLog.create({
// //       type: 'ATTENDANCE_MARKED',
// //       severity: 'info',
// //       scholar: scholar._id,
// //       organization: scholar.organizationId,
// //       details: {
// //         proofId,
// //         biometricType,
// //         locationValid,
// //         timestamp: new Date()
// //       }
// //     }, { session });

// //     await session.commitTransaction();
// //     logger.info(`Attendance marked for scholar ${scholarId} with biometric verification`);

// //     res.json({
// //       success: true,
// //       message: 'Attendance marked successfully with biometric verification',
// //       attendance: {
// //         id: attendanceRecord._id,
// //         markedAt: attendanceRecord.markedAt,
// //         status: attendanceRecord.status,
// //         proofId: attendanceRecord.proofId,
// //         locationValid: attendanceRecord.locationValid,
// //         verificationMethod: attendanceRecord.verificationMethod,
// //         biometricVerified: true,
// //         timestamp: attendanceRecord.markedAt
// //       }
// //     });

// //   } catch (error) {
// //     await session.abortTransaction();
// //     logger.error('Mark attendance error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'Failed to mark attendance',
// //       code: 'ATTENDANCE_MARKING_FAILED',
// //       details: process.env.NODE_ENV === 'development' ? error.message : undefined
// //     });
// //   } finally {
// //     session.endSession();
// //   }
// // });

// // // Get today's attendance for a scholar
// // router.get('/today', authenticateToken, requireRole('scholar'), async (req, res) => {
// //   try {
// //     const today = new Date();
// //     today.setHours(0, 0, 0, 0);
// //     const tomorrow = new Date(today);
// //     tomorrow.setDate(tomorrow.getDate() + 1);

// //     const attendance = await AttendanceRecord.findOne({
// //       scholar: req.user.id,
// //       markedAt: { $gte: today, $lt: tomorrow }
// //     }).populate('biometricCommitment', 'type');

// //     if (!attendance) {
// //       return res.status(404).json({
// //         success: false,
// //         error: 'No attendance record found for today',
// //         attendance: null
// //       });
// //     }

// //     res.json({
// //       success: true,
// //       attendance: {
// //         id: attendance._id,
// //         markedAt: attendance.markedAt,
// //         status: attendance.status,
// //         proofId: attendance.proofId,
// //         locationValid: attendance.locationValid,
// //         verificationMethod: attendance.verificationMethod,
// //         biometricType: attendance.biometricType,
// //         biometricVerified: true,
// //         timestamp: attendance.markedAt
// //       }
// //     });

// //   } catch (error) {
// //     logger.error('Get today attendance error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'Failed to fetch today\'s attendance'
// //     });
// //   }
// // });

// // // Get attendance history
// // router.get('/history', authenticateToken, requireRole('scholar'), async (req, res) => {
// //   try {
// //     const { startDate, endDate, page = 1, limit = 20 } = req.query;
    
// //     const query = { scholar: req.user.id };
    
// //     if (startDate && endDate) {
// //       query.markedAt = {
// //         $gte: new Date(startDate),
// //         $lte: new Date(endDate)
// //       };
// //     }

// //     const totalRecords = await AttendanceRecord.countDocuments(query);
// //     const totalPages = Math.ceil(totalRecords / limit);
    
// //     const attendance = await AttendanceRecord.find(query)
// //       .sort({ markedAt: -1 })
// //       .limit(limit * 1)
// //       .skip((page - 1) * limit)
// //       .populate('biometricCommitment', 'type');

// //     res.json({
// //       success: true,
// //       attendance: attendance.map(record => ({
// //         id: record._id,
// //         markedAt: record.markedAt,
// //         status: record.status,
// //         proofId: record.proofId,
// //         locationValid: record.locationValid,
// //         verificationMethod: record.verificationMethod,
// //         biometricType: record.biometricType
// //       })),
// //       pagination: {
// //         currentPage: parseInt(page),
// //         totalPages,
// //         totalRecords,
// //         limit: parseInt(limit)
// //       }
// //     });

// //   } catch (error) {
// //     logger.error('Get attendance history error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'Failed to fetch attendance history'
// //     });
// //   }
// // });

// // // Verify attendance proof
// // router.get('/verify/:proofId', async (req, res) => {
// //   try {
// //     const { proofId } = req.params;

// //     const attendance = await AttendanceRecord.findOne({ proofId })
// //       .populate('scholar', 'scholarId personalInfo.name')
// //       .populate('organization', 'name')
// //       .populate('biometricCommitment', 'type status');

// //     if (!attendance) {
// //       return res.status(404).json({
// //         success: false,
// //         error: 'Invalid proof ID',
// //         code: 'INVALID_PROOF_ID'
// //       });
// //     }

// //     // Verify the proof
// //     let isValid = true;
// //     let verificationDetails = {
// //       method: attendance.verificationMethod,
// //       biometricVerified: !!attendance.biometricCommitment,
// //       locationVerified: attendance.locationValid,
// //       timestamp: attendance.markedAt
// //     };

// //     if (attendance.verificationMethod === 'zkp_biometric' && zkpService.isInitialized()) {
// //       try {
// //         isValid = await zkpService.verifyProof(attendance.zkpProof);
// //         verificationDetails.zkpVerified = isValid;
// //       } catch (error) {
// //         logger.error('Proof verification error:', error);
// //         isValid = false;
// //         verificationDetails.zkpVerified = false;
// //       }
// //     }

// //     // Check if biometric commitment is still active
// //     if (attendance.biometricCommitment && attendance.biometricCommitment.status !== 'active') {
// //       isValid = false;
// //       verificationDetails.biometricStatus = 'revoked';
// //     }

// //     res.json({
// //       success: true,
// //       valid: isValid,
// //       verificationDetails,
// //       attendance: {
// //         scholarId: attendance.scholar.scholarId,
// //         scholarName: attendance.scholar.personalInfo.name,
// //         organization: attendance.organization.name,
// //         markedAt: attendance.markedAt,
// //         status: attendance.status,
// //         verificationMethod: attendance.verificationMethod,
// //         proofId: attendance.proofId
// //       }
// //     });

// //   } catch (error) {
// //     logger.error('Verify attendance error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'Failed to verify attendance proof'
// //     });
// //   }
// // });

// // // Admin: Get attendance records for organization
// // router.get('/organization/:date', authenticateToken, requireRole('admin', 'super_admin'), async (req, res) => {
// //   try {
// //     const { date } = req.params;
// //     const { page = 1, limit = 50 } = req.query;
    
// //     const attendanceDate = new Date(date);
// //     attendanceDate.setHours(0, 0, 0, 0);
// //     const nextDay = new Date(attendanceDate);
// //     nextDay.setDate(nextDay.getDate() + 1);

// //     const query = {
// //       organization: req.user.organizationId,
// //       markedAt: {
// //         $gte: attendanceDate,
// //         $lt: nextDay
// //       }
// //     };

// //     const totalRecords = await AttendanceRecord.countDocuments(query);
// //     const totalPages = Math.ceil(totalRecords / limit);

// //     const attendanceRecords = await AttendanceRecord.find(query)
// //       .populate('scholar', 'scholarId personalInfo.name academicInfo.department')
// //       .populate('biometricCommitment', 'type')
// //       .sort({ markedAt: -1 })
// //       .limit(limit * 1)
// //       .skip((page - 1) * limit);

// //     res.json({
// //       success: true,
// //       date: date,
// //       attendance: attendanceRecords.map(record => ({
// //         id: record._id,
// //         scholar: {
// //           id: record.scholar._id,
// //           scholarId: record.scholar.scholarId,
// //           name: record.scholar.personalInfo.name,
// //           department: record.scholar.academicInfo?.department
// //         },
// //         markedAt: record.markedAt,
// //         status: record.status,
// //         proofId: record.proofId,
// //         locationValid: record.locationValid,
// //         verificationMethod: record.verificationMethod,
// //         biometricType: record.biometricType,
// //         biometricVerified: !!record.biometricCommitment
// //       })),
// //       pagination: {
// //         currentPage: parseInt(page),
// //         totalPages,
// //         totalRecords,
// //         limit: parseInt(limit)
// //       }
// //     });

// //   } catch (error) {
// //     logger.error('Get organization attendance error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'Failed to fetch attendance records'
// //     });
// //   }
// // });

// // // Helper function to calculate distance between two coordinates
// // function calculateDistance(lat1, lon1, lat2, lon2) {
// //   const R = 6371e3; // Earth's radius in meters
// //   const φ1 = lat1 * Math.PI/180;
// //   const φ2 = lat2 * Math.PI/180;
// //   const Δφ = (lat2-lat1) * Math.PI/180;
// //   const Δλ = (lon2-lon1) * Math.PI/180;

// //   const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
// //             Math.cos(φ1) * Math.cos(φ2) *
// //             Math.sin(Δλ/2) * Math.sin(Δλ/2);
// //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

// //   return R * c; // Distance in meters
// // }

// // export default router;