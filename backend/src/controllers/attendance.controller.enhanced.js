// backend/src/controllers/attendance.controller.enhanced.js
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import enhancedZKPService from '../services/zkp.service.enhanced.js';
import QRCode from 'qrcode';
import logger from '../utils/logger.js';

// Generate attendance proof for QR code
export const generateAttendanceProof = async (req, res) => {
  try {
    const {
      attendanceType = 'checkIn',
      location,
      biometricData
    } = req.body;

    const userId = req.user.id;
    const scholarId = req.user.scholarId;
    const organizationId = req.user.organizationId;

    logger.info(`Attendance proof generation for scholar: ${scholarId}`);

    // Validate required fields
    if (!biometricData || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing: {
          biometricData: !biometricData,
          location: !location
        }
      });
    }

    // Find scholar
    const scholar = await Scholar.findById(userId);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Check if biometric is enrolled - look for biometric commitment
    const biometricRecord = await BiometricCommitment.findOne({
      userId: scholar._id,
      isActive: true
    });

    if (!biometricRecord) {
      logger.warn(`Scholar ${scholarId} attempted attendance without biometric enrollment`);
      return res.status(400).json({
        success: false,
        error: 'Biometric not enrolled. Please complete biometric enrollment first.',
        code: 'BIOMETRIC_NOT_ENROLLED'
      });
    }

    // Check if at least ONE biometric is enrolled (fingerprint OR face)
    const hasFingerprint = biometricRecord.commitments?.fingerprint?.hash ? true : false;
    const hasFace = biometricRecord.commitments?.face?.hash ? true : false;

    if (!hasFingerprint && !hasFace) {
      logger.warn(`Scholar ${scholarId} has no valid biometric enrollment`);
      return res.status(400).json({
        success: false,
        error: 'No valid biometric enrollment found. Please enroll at least one biometric method.',
        code: 'NO_BIOMETRIC_ENROLLED'
      });
    }

    // Validate that the biometric type being used is enrolled
    const requestedBiometricType = biometricData.type || 'fingerprint';
    if (requestedBiometricType === 'fingerprint' && !hasFingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Fingerprint not enrolled. Please enroll your fingerprint or use face recognition.',
        code: 'FINGERPRINT_NOT_ENROLLED'
      });
    }

    if (requestedBiometricType === 'face' && !hasFace) {
      return res.status(400).json({
        success: false,
        error: 'Face not enrolled. Please enroll your face or use fingerprint.',
        code: 'FACE_NOT_ENROLLED'
      });
    }

    logger.info(`Scholar ${scholarId} has enrolled biometrics - Fingerprint: ${hasFingerprint}, Face: ${hasFace}`);

    // Check today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      scholarId: scholar._id,
      date: { $gte: today },
      attendanceType
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: `${attendanceType === 'checkIn' ? 'Check-in' : 'Check-out'} already marked for today`,
        code: 'ATTENDANCE_ALREADY_MARKED',
        attendance: {
          markedAt: existingAttendance.date,
          proofId: existingAttendance.proofData?.zkProof?.proofId
        }
      });
    }

    // For checkout, verify checkin exists
    if (attendanceType === 'checkOut') {
      const checkIn = await Attendance.findOne({
        scholarId: scholar._id,
        date: { $gte: today },
        attendanceType: 'checkIn'
      });

      if (!checkIn) {
        return res.status(400).json({
          success: false,
          error: 'Cannot check out without checking in first',
          code: 'NO_CHECKIN_FOUND'
        });
      }
    }

    // Generate ZKP proof
    const zkpKeys = enhancedZKPService.getKeys();
    const timestamp = Date.now();

    // Generate attendance proof using biometric data
    const attendanceProof = await enhancedZKPService.generateAttendanceProof(
      scholar._id.toString(),
      biometricData.proof || biometricData.nullifier,
      timestamp
    );

    // Get organization for location verification
    const organization = await Organization.findById(organizationId);

    // Verify location if organization has location settings
    let locationValid = true;
    let locationProof = null;

    if (organization?.settings?.requireLocation && organization.location?.coordinates) {
      locationProof = await enhancedZKPService.generateLocationProof(
        location,
        organization.location
      );
      locationValid = locationProof.isValid;
    }

    // Generate QR code data
    const qrData = await enhancedZKPService.generateAttendanceQR({
      proofId: attendanceProof.proofId,
      scholarId: scholar.scholarId,
      organizationId,
      timestamp,
      attendanceType,
      locationValid
    });

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrData.qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create attendance record with correct status
    const attendance = new Attendance({
      scholarId: scholar._id,
      organizationId,
      date: new Date(),
      attendanceType,
      status: 'present', // FIXED: Changed from 'pending' to 'present'
      proofData: {
        zkProof: attendanceProof,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date()
        } : null,
        verificationMethod: 'biometric_zkp'
      },
      deviceInfo: biometricData.deviceInfo || {},
      metadata: {
        checkInTime: attendanceType === 'checkIn' ? new Date() : undefined,
        checkOutTime: attendanceType === 'checkOut' ? new Date() : undefined,
        isLate: false,
        biometricVerified: true,
        locationVerified: locationValid
      }
    });

    await attendance.save();

    // Update scholar stats
    if (attendanceType === 'checkIn') {
      await scholar.updateAttendanceStats();
    }

    logger.info(`Attendance proof generated successfully for scholar ${scholarId}`);

    res.json({
      success: true,
      message: 'Attendance proof generated successfully',
      data: {
        proofId: attendanceProof.proofId,
        qrCode: qrCodeImage,
        expiresAt: qrData.expiresAt,
        attendance: {
          id: attendance._id,
          type: attendanceType,
          markedAt: attendance.date,
          status: attendance.status,
          locationValid,
          biometricVerified: true
        },
        verificationUrl: `/api/attendance/verify/${attendanceProof.proofId}`
      }
    });

  } catch (error) {
    logger.error('Generate attendance proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate attendance proof',
      details: error.message
    });
  }
};

// Verify scanned QR code and mark attendance
export const verifyQRAttendance = async (req, res) => {
  try {
    const { qrData } = req.body;
    const adminOrgId = req.user.organizationId;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
    }

    // Decode QR data
    let decodedData;
    try {
      const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
      decodedData = JSON.parse(decoded);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code format'
      });
    }

    // Find the attendance record by proof ID
    const attendance = await Attendance.findOne({
      'proofData.zkProof.proofId': decodedData.id
    }).populate('scholarId', 'scholarId personalInfo.name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired QR code'
      });
    }

    // Verify organization matches
    if (attendance.organizationId.toString() !== adminOrgId) {
      return res.status(403).json({
        success: false,
        error: 'This QR code belongs to a different organization'
      });
    }

    // Check if already verified
    if (attendance.status === 'present') {
      return res.status(400).json({
        success: false,
        error: 'This attendance has already been verified',
        attendance: {
          scholarName: attendance.scholarId.personalInfo.name,
          scholarId: attendance.scholarId.scholarId,
          markedAt: attendance.date,
          type: attendance.attendanceType
        }
      });
    }

    // Verify the ZKP proof
    const isValidProof = await enhancedZKPService.verifyAttendanceProof(
      attendance.proofData.zkProof
    );

    if (!isValidProof) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attendance proof'
      });
    }

    // Check expiry (5 minutes)
    const proofAge = Date.now() - attendance.date.getTime();
    if (proofAge > 5 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        error: 'QR code has expired. Please generate a new one.'
      });
    }

    // Update attendance status
    attendance.status = 'present';
    attendance.metadata.verifiedAt = new Date();
    attendance.metadata.verifiedBy = req.user.id;
    await attendance.save();

    // Update scholar stats
    const scholar = attendance.scholarId;
    if (attendance.attendanceType === 'checkIn' && scholar) {
      await scholar.updateAttendanceStats();
    }

    logger.info(`QR attendance verified for scholar ${scholar.scholarId}`);

    res.json({
      success: true,
      message: 'Attendance verified successfully',
      attendance: {
        scholarName: scholar.personalInfo.name,
        scholarId: scholar.scholarId,
        type: attendance.attendanceType,
        markedAt: attendance.date,
        locationValid: attendance.metadata.locationValid,
        biometricVerified: attendance.metadata.biometricVerified
      }
    });

  } catch (error) {
    logger.error('Verify QR attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify attendance',
      details: error.message
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      scholarId: userId,
      date: { $gte: today }
    }).sort({ date: -1 });

    const checkIn = attendance.find(a => a.attendanceType === 'checkIn');
    const checkOut = attendance.find(a => a.attendanceType === 'checkOut');

    res.json({
      success: true,
      attendance: {
        checkIn: checkIn?.date || null,
        checkOut: checkOut?.date || null,
        status: checkIn?.status || 'absent',
        checkInProofId: checkIn?.proofData?.zkProof?.proofId,
        checkOutProofId: checkOut?.proofData?.zkProof?.proofId
      },
      // Also include new format for compatibility
      hasCheckedIn: !!checkIn,
      hasCheckedOut: !!checkOut,
      checkInTime: checkIn?.date,
      checkOutTime: checkOut?.date,
      checkInProofId: checkIn?.proofData?.zkProof?.proofId,
      checkOutProofId: checkOut?.proofData?.zkProof?.proofId,
      status: checkIn?.status || 'absent'
    });

  } catch (error) {
    logger.error('Get today status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attendance status'
    });
  }
};

// Get attendance history
export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, month, year } = req.query;

    const query = { scholarId: userId };

    // Add date filters if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const total = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('organizationId', 'name');

    res.json({
      success: true,
      attendance: attendance.map(record => ({
        id: record._id,
        date: record.date,
        type: record.attendanceType,
        status: record.status,
        checkInTime: record.metadata.checkInTime,
        checkOutTime: record.metadata.checkOutTime,
        organization: record.organizationId?.name,
        proofId: record.proofData?.zkProof?.proofId,
        locationValid: record.metadata.locationValid,
        biometricVerified: record.metadata.biometricVerified
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attendance history'
    });
  }
};

// Export all functions
export default {
  generateAttendanceProof,
  verifyQRAttendance,
  getTodayStatus
};