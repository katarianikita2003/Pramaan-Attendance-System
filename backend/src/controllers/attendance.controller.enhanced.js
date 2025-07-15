// backend/src/controllers/attendance.controller.enhanced.js
import Attendance from '../models/Attendance.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import enhancedZKPService from '../services/zkp.service.enhanced.js';
import logger from '../utils/logger.js';

/**
 * Enhanced Attendance Controller with QR Code Support
 */
class AttendanceController {
  /**
   * Generate attendance proof and QR code for scholar
   */
  async generateAttendanceProof(req, res) {
    try {
      const { biometricData, location, attendanceType = 'checkIn' } = req.body;
      const scholarId = req.user.scholarId;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      logger.info(`Attendance proof generation for scholar: ${scholarId}`);

      // Validate scholar
      const scholar = await Scholar.findById(userId)
        .select('+biometricEnrollment.fingerprint.commitment +biometricEnrollment.face.commitment');
      
      if (!scholar) {
        return res.status(404).json({
          success: false,
          error: 'Scholar not found'
        });
      }

      // Check biometric enrollment - supporting multiple fields for compatibility
      const hasEnrolledBiometric = 
        scholar.isBiometricEnrolled || 
        scholar.biometrics?.isEnrolled ||
        scholar.biometricEnrollment?.fingerprint?.isActive ||
        scholar.biometricEnrollment?.face?.isActive;

      if (!hasEnrolledBiometric) {
        logger.warn(`Scholar ${scholarId} attempted attendance without biometric enrollment`);
        return res.status(400).json({
          success: false,
          error: 'Biometric not enrolled',
          code: 'BIOMETRIC_NOT_ENROLLED'
        });
      }

      // Get the appropriate biometric commitment
      let biometricCommitment;
      const biometricType = biometricData?.type || 'fingerprint';
      
      if (biometricType === 'fingerprint') {
        biometricCommitment = scholar.biometricEnrollment?.fingerprint?.commitment || 
                            scholar.biometrics?.fingerprintCommitment;
      } else if (biometricType === 'face') {
        biometricCommitment = scholar.biometricEnrollment?.face?.commitment || 
                            scholar.biometrics?.faceCommitment;
      }

      if (!biometricCommitment) {
        return res.status(400).json({
          success: false,
          error: `No ${biometricType} biometric commitment found`,
          code: 'BIOMETRIC_COMMITMENT_NOT_FOUND'
        });
      }

      // Check if already marked attendance today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingAttendance = await Attendance.findOne({
        scholarId: scholar._id,
        type: attendanceType,
        status: { $in: ['verified', 'pending_verification'] },
        createdAt: { $gte: today, $lt: tomorrow }
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          error: `${attendanceType} already marked for today`,
          code: 'ATTENDANCE_ALREADY_MARKED'
        });
      }

      // Get organization and ZKP keys
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
      }

      let keys = enhancedZKPService.getKeys(organizationId);
      
      if (!keys) {
        // Generate keys if not exists
        keys = await enhancedZKPService.generateKeys(organizationId);
        
        // Store verification key in organization
        organization.zkpKeys = {
          verificationKey: keys.verificationKey,
          keyVersion: 1,
          generatedAt: new Date()
        };
        await organization.save();
      }

      // Generate ZKP proof with proper data structure
      const proofData = await enhancedZKPService.generateProof(
        biometricData,  // Pass the full biometric data object
        biometricCommitment,  // Pass the commitment string
        keys.provingKey
      );

      // Generate unique proof ID
      const proofId = `${scholarId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Generate QR code data
      const qrData = {
        proofId,
        scholarId,
        proof: proofData.proof,
        publicSignals: proofData.publicSignals,
        timestamp: Date.now(),
        type: attendanceType,
        organizationId
      };

      // Generate QR code
      const qrResult = await enhancedZKPService.generateAttendanceQR(
        scholarId,
        proofData.proof,
        proofData.publicSignals,
        proofId
      );

      // Create attendance record in pending state
      const attendance = new Attendance({
        scholarId: scholar._id,
        organizationId,
        proofId,
        type: attendanceType,
        status: 'pending_verification',
        location: location ? {
          type: 'Point',
          coordinates: location.coordinates || [0, 0],
          accuracy: location.accuracy,
          timestamp: new Date()
        } : undefined,
        proofData: {
          zkProof: {
            proof: proofData.proof,
            publicSignals: proofData.publicSignals,
            proofId,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
          }
        },
        deviceInfo: req.body.deviceInfo || {},
        biometricType: biometricType
      });

      await attendance.save();

      logger.info(`Attendance proof generated for scholar ${scholarId}, proofId: ${proofId}`);

      res.json({
        success: true,
        data: {
          qrCode: qrResult.qrCode,
          proofId,
          expiresAt: qrResult.expiresAt,
          attendanceId: attendance._id,
          type: attendanceType
        }
      });

    } catch (error) {
      logger.error('Generate attendance proof error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate attendance proof',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verify attendance proof from QR code (Admin function)
   */
  async verifyAttendanceQR(req, res) {
    try {
      const { qrData } = req.body;
      const adminOrganizationId = req.user.organizationId;

      logger.info('Admin verifying attendance QR code');

      // Parse and verify QR code format
      let qrContent;
      try {
        qrContent = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code format'
        });
      }

      // Verify QR code hasn't expired
      const qrTimestamp = qrContent.timestamp;
      const currentTime = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (currentTime - qrTimestamp > fiveMinutes) {
        return res.status(400).json({
          success: false,
          error: 'QR code has expired',
          code: 'QR_EXPIRED'
        });
      }

      // Verify organization match
      if (qrContent.organizationId !== adminOrganizationId) {
        return res.status(403).json({
          success: false,
          error: 'QR code is from a different organization'
        });
      }

      // Find the scholar
      const scholar = await Scholar.findOne({ 
        scholarId: qrContent.scholarId,
        organizationId: adminOrganizationId
      });

      if (!scholar) {
        return res.status(404).json({
          success: false,
          error: 'Scholar not found in this organization'
        });
      }

      // Get organization verification key
      const organization = await Organization.findById(adminOrganizationId);
      if (!organization.zkpKeys || !organization.zkpKeys.verificationKey) {
        return res.status(400).json({
          success: false,
          error: 'Organization verification key not found'
        });
      }

      // Verify the ZKP proof
      const isValidProof = await enhancedZKPService.verifyProof(
        qrContent.proof,
        qrContent.publicSignals,
        organization.zkpKeys.verificationKey
      );

      if (!isValidProof) {
        logger.warn(`Invalid proof attempt for scholar ${qrContent.scholarId}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid attendance proof'
        });
      }

      // Find the attendance record
      const attendance = await Attendance.findOne({
        scholarId: scholar._id,
        proofId: qrContent.proofId,
        status: 'pending_verification'
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found or already verified'
        });
      }

      // Update attendance status
      attendance.status = 'verified';
      attendance.verifiedBy = req.user.id;
      attendance.verifiedAt = new Date();
      attendance.verificationDetails = {
        method: 'qr_scan',
        adminId: req.user.id,
        verificationLocation: req.body.location || null
      };
      
      await attendance.save();

      // Update scholar's attendance stats
      await scholar.updateAttendanceStats();

      logger.info(`Attendance verified for scholar ${scholar.scholarId} by admin ${req.user.id}`);

      // Return success with scholar details
      res.json({
        success: true,
        data: {
          scholar: {
            id: scholar._id,
            scholarId: scholar.scholarId,
            name: scholar.personalInfo.name,
            department: scholar.academicInfo.department,
            course: scholar.academicInfo.course,
            year: scholar.academicInfo.year
          },
          attendance: {
            id: attendance._id,
            type: attendance.type,
            timestamp: attendance.createdAt,
            verifiedAt: attendance.verifiedAt
          },
          message: `${attendance.type} verified successfully`
        }
      });

    } catch (error) {
      logger.error('Verify attendance QR error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get pending verifications for admin
   */
  async getPendingVerifications(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const pendingAttendances = await Attendance.find({
        organizationId,
        status: 'pending_verification',
        'proofData.zkProof.expiresAt': { $gt: new Date() }
      })
      .populate('scholarId', 'scholarId personalInfo academicInfo')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

      const total = await Attendance.countDocuments({
        organizationId,
        status: 'pending_verification',
        'proofData.zkProof.expiresAt': { $gt: new Date() }
      });

      res.json({
        success: true,
        data: {
          attendances: pendingAttendances.map(att => ({
            id: att._id,
            proofId: att.proofId,
            scholar: {
              id: att.scholarId._id,
              scholarId: att.scholarId.scholarId,
              name: att.scholarId.personalInfo.name,
              department: att.scholarId.academicInfo.department
            },
            type: att.type,
            timestamp: att.createdAt,
            expiresAt: att.proofData.zkProof.expiresAt,
            location: att.location
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get pending verifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending verifications'
      });
    }
  }

  /**
   * Get attendance history with verification status
   */
  async getAttendanceHistory(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, status, type, page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const query = { scholarId: userId };
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      if (status) {
        query.status = status;
      }

      if (type) {
        query.type = type;
      }

      const attendances = await Attendance.find(query)
        .populate('verifiedBy', 'personalInfo.name')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Attendance.countDocuments(query);

      res.json({
        success: true,
        data: {
          attendances: attendances.map(att => ({
            id: att._id,
            type: att.type,
            status: att.status,
            timestamp: att.createdAt,
            verifiedAt: att.verifiedAt,
            verifiedBy: att.verifiedBy ? att.verifiedBy.personalInfo.name : null,
            location: att.location,
            proofId: att.proofId,
            biometricType: att.biometricType
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get attendance history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance history'
      });
    }
  }

  /**
   * Get today's attendance status for scholar
   */
  async getTodayStatus(req, res) {
    try {
      const userId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendances = await Attendance.find({
        scholarId: userId,
        createdAt: { $gte: today, $lt: tomorrow }
      }).sort('createdAt');

      const checkIn = attendances.find(a => a.type === 'checkIn');
      const checkOut = attendances.find(a => a.type === 'checkOut');

      res.json({
        success: true,
        data: {
          date: today,
          checkIn: checkIn ? {
            time: checkIn.createdAt,
            status: checkIn.status,
            verifiedAt: checkIn.verifiedAt
          } : null,
          checkOut: checkOut ? {
            time: checkOut.createdAt,
            status: checkOut.status,
            verifiedAt: checkOut.verifiedAt
          } : null,
          canMarkCheckIn: !checkIn,
          canMarkCheckOut: checkIn && checkIn.status === 'verified' && !checkOut
        }
      });

    } catch (error) {
      logger.error('Get today status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch today\'s status'
      });
    }
  }
}

export default new AttendanceController();