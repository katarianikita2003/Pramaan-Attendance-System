// backend/src/controllers/attendance.controller.enhanced.js
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import enhancedZKPService from '../services/zkp.service.enhanced.js';
import biometricVerificationService from '../services/biometric.verification.service.js';
import QRCode from 'qrcode';
import logger from '../utils/logger.js';

// Generate attendance proof for QR code
export const generateAttendanceProof = async (req, res) => {
  try {
    // Log the entire request for debugging
    logger.info('=== ATTENDANCE PROOF REQUEST ===');
    logger.info(`Raw request body: ${JSON.stringify(req.body, null, 2)}`);
    
    const { 
      attendanceType = 'checkIn',
      location,
      biometricData 
    } = req.body;
    
    logger.info(`Destructured attendanceType: "${attendanceType}"`);
    logger.info(`Type of attendanceType: ${typeof attendanceType}`);
    
    const userId = req.user.id;
    const scholarId = req.user.scholarId;
    const organizationId = req.user.organizationId;

    logger.info(`Attendance proof generation for scholar: ${scholarId}`);

    // Validate attendanceType explicitly
    if (!['checkIn', 'checkOut'].includes(attendanceType)) {
      logger.error(`Invalid attendanceType received: ${attendanceType}`);
      return res.status(400).json({
        success: false,
        error: `Invalid attendanceType: ${attendanceType}. Must be 'checkIn' or 'checkOut'`
      });
    }

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

    // Check if biometric is enrolled
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

    // Check if at least ONE biometric is enrolled
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

    // Verify biometric using the verification service
    const verificationResult = await biometricVerificationService.verifyBiometric(
      scholar._id,
      requestedBiometricType,
      biometricData
    );

    if (!verificationResult.verified) {
      logger.warn(`Biometric verification failed for scholar ${scholarId}: ${verificationResult.error}`);
      return res.status(403).json({
        success: false,
        error: verificationResult.error || 'Biometric verification failed',
        code: 'BIOMETRIC_VERIFICATION_FAILED'
      });
    }

    logger.info(`Biometric verified successfully for scholar ${scholarId}`);

    // Check today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check for existing attendance based on type
    const existingAttendance = await Attendance.findOne({
      scholarId: scholar._id,
      organizationId,
      date: { $gte: today, $lt: tomorrow },
      attendanceType: attendanceType
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: `${attendanceType === 'checkIn' ? 'Check-in' : 'Check-out'} already marked for today`,
        markedAt: existingAttendance.date
      });
    }

    // For checkout, verify check-in exists
    if (attendanceType === 'checkOut') {
      const checkInRecord = await Attendance.findOne({
        scholarId: scholar._id,
        organizationId,
        date: { $gte: today, $lt: tomorrow },
        attendanceType: 'checkIn'
      });

      if (!checkInRecord) {
        return res.status(400).json({
          success: false,
          error: 'Cannot check out without checking in first',
          code: 'NO_CHECKIN_FOUND'
        });
      }
    }

    // Generate ZKP proof
    const timestamp = Date.now();
    const zkProof = await enhancedZKPService.generateAttendanceProof(
      scholarId,
      `${requestedBiometricType}_verified_${timestamp}`,
      timestamp
    );

    // Generate QR data
    const qrData = await enhancedZKPService.generateAttendanceQR({
      proofId: zkProof.proofId,
      scholarId: scholar.scholarId,
      organizationId,
      timestamp,
      attendanceType,
      locationValid: true
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

    // Create attendance data object matching the schema
    logger.info(`Creating attendance record with attendanceType: ${attendanceType}`);
    
    const attendanceData = {
      scholarId: scholar._id,
      organizationId,
      date: new Date(),
      attendanceType: attendanceType, // CRITICAL: This field is required by the schema
      status: 'present', // Set as present immediately
      proofData: {
        zkProof: {
          proofId: zkProof.proofId,
          proof: zkProof.proof || 'simulated_proof', // Required field
          publicInputs: zkProof.publicInputs || {
            commitmentHash: zkProof.commitmentHash,
            timestamp: zkProof.timestamp,
            nullifier: zkProof.nullifier
          },
          verificationKey: zkProof.verificationKey,
          protocol: zkProof.protocol || 'groth16'
        },
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0,
          timestamp: new Date()
        } : null,
        verificationMethod: 'biometric_zkp'
      },
      deviceInfo: req.body.deviceInfo || {
        deviceId: 'unknown',
        platform: 'unknown',
        appVersion: 'unknown'
      },
      metadata: {
        checkInTime: attendanceType === 'checkIn' ? new Date() : undefined,
        checkOutTime: attendanceType === 'checkOut' ? new Date() : undefined,
        isLate: false,
        biometricVerified: true,
        locationVerified: true,
        remarks: `${attendanceType} via biometric verification`,
        qrGenerated: true,
        biometricType: requestedBiometricType
      }
    };

    logger.info(`Attendance data prepared: ${JSON.stringify(attendanceData, null, 2)}`);

    // Create and save attendance record
    const attendance = new Attendance(attendanceData);
    
    // Validate before saving
    const validationError = attendance.validateSync();
    if (validationError) {
      logger.error('Attendance validation error:', validationError);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.message
      });
    }

    await attendance.save();
    logger.info(`Attendance record saved successfully with ID: ${attendance._id}`);

    // Return response with QR data
    res.json({
      success: true,
      message: 'Attendance proof generated successfully',
      qrData: qrData.qrData,
      qrCode: qrCodeImage,
      proofId: zkProof.proofId,
      expiresAt: qrData.expiresAt,
      pendingAttendanceId: attendance._id,
      attendanceType,
      locationValid: true
    });

  } catch (error) {
    logger.error('Generate attendance proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate attendance proof',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find check-in and check-out records for today
    const checkInRecord = await Attendance.findOne({
      scholarId: userId,
      date: { $gte: today, $lt: tomorrow },
      attendanceType: 'checkIn'
    });

    const checkOutRecord = await Attendance.findOne({
      scholarId: userId,
      date: { $gte: today, $lt: tomorrow },
      attendanceType: 'checkOut'
    });

    const status = {
      hasCheckedIn: !!checkInRecord,
      hasCheckedOut: !!checkOutRecord,
      checkIn: checkInRecord?.date || null,
      checkOut: checkOutRecord?.date || null,
      status: checkInRecord?.status || 'absent',
      checkInProofId: checkInRecord?.proofData?.zkProof?.proofId,
      checkOutProofId: checkOutRecord?.proofData?.zkProof?.proofId
    };

    res.json({
      success: true,
      attendance: status,
      ...status // Spread for backward compatibility
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
    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('organizationId', 'name');

    res.json({
      success: true,
      attendance: attendances.map(record => ({
        id: record._id,
        date: record.date,
        type: record.attendanceType,
        status: record.status,
        checkInTime: record.metadata?.checkInTime,
        checkOutTime: record.metadata?.checkOutTime,
        organization: record.organizationId?.name,
        proofId: record.proofData?.zkProof?.proofId,
        locationValid: record.metadata?.locationVerified,
        biometricVerified: record.metadata?.biometricVerified
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

// Verify scanned QR code and mark attendance
export const verifyQRAttendance = async (req, res) => {
  try {
    const { qrData } = req.body;
    const adminOrgId = req.user.organizationId;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR code data is required'
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
        error: 'QR code is for a different organization'
      });
    }

    // Check if QR is expired
    const qrAge = Date.now() - new Date(attendance.date).getTime();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (qrAge > maxAge) {
      return res.status(400).json({
        success: false,
        error: 'QR code has expired. Please generate a new one.'
      });
    }

    // Update attendance status to present
    attendance.status = 'present';
    attendance.metadata.verifiedAt = new Date();
    attendance.metadata.verifiedBy = req.user.id;
    await attendance.save();

    // Update scholar stats if check-in
    if (attendance.attendanceType === 'checkIn' && attendance.scholarId) {
      await attendance.scholarId.updateAttendanceStats();
    }

    logger.info(`QR attendance verified for scholar ${attendance.scholarId.scholarId}`);

    res.json({
      success: true,
      message: 'Attendance verified successfully',
      attendance: {
        scholarName: attendance.scholarId.personalInfo.name,
        scholarId: attendance.scholarId.scholarId,
        type: attendance.attendanceType,
        markedAt: attendance.date,
        locationValid: attendance.metadata?.locationVerified,
        biometricVerified: attendance.metadata?.biometricVerified
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

// Export all functions
export default {
  generateAttendanceProof,
  getTodayStatus,
  getAttendanceHistory,
  verifyQRAttendance
};