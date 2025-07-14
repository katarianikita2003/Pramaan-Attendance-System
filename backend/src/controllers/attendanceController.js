// backend/src/controllers/attendanceController.js
import Attendance from '../models/Attendance.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import { zkpService } from '../services/zkp.service.js';
import locationService from '../services/locationService.js';
import logger from '../utils/logger.js';

// Mark attendance with biometric verification
export const markAttendance = async (req, res) => {
  try {
    const { 
      biometricProof,  // The proof generated from current fingerprint scan
      location, 
      attendanceType = 'checkIn',
      deviceInfo
    } = req.body;
    
    // Get scholar info from authenticated user
    const userId = req.user.id;
    const scholarId = req.user.scholarId;
    const organizationId = req.user.organizationId;

    logger.info(`Attendance marking attempt by scholar: ${scholarId}`);

    // Log what we received for debugging
    logger.info(`Received biometric proof: ${biometricProof ? 'present' : 'missing'}`);
    if (biometricProof) {
      logger.info(`Biometric proof type: ${typeof biometricProof}, length: ${biometricProof.length}`);
    }

    // Validate required fields
    if (!biometricProof || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing: {
          biometricProof: !biometricProof,
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
    const biometricCommitment = await BiometricCommitment.findByUserId(scholar._id);
    if (!biometricCommitment) {
      logger.warn(`Scholar ${scholarId} attempted attendance without biometric enrollment`);
      return res.status(400).json({
        success: false,
        error: 'Biometric not enrolled. Please enroll your biometric first.',
        code: 'BIOMETRIC_NOT_ENROLLED'
      });
    }

    // Verify that fingerprint is enrolled
    if (!biometricCommitment.commitments.fingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Fingerprint not enrolled. Please enroll your fingerprint first.',
        code: 'FINGERPRINT_NOT_ENROLLED'
      });
    }

    // Verify the biometric proof matches the enrolled fingerprint
    let isValidProof = false;
    
    try {
      // In simulation mode, check if the proof is a valid hash string
      if (zkpService.isSimulationMode) {
        // For simulation: accept any valid hash string
        isValidProof = biometricProof && 
                      typeof biometricProof === 'string' && 
                      biometricProof.length >= 32;
        logger.info(`Biometric proof verification (simulation): ${isValidProof ? 'PASSED' : 'FAILED'}`);
      } else {
        // For production: actual ZKP verification
        isValidProof = await zkpService.verifyBiometricProof(
          biometricProof,
          biometricCommitment.commitments.fingerprint
        );
      }
    } catch (error) {
      logger.error('Error verifying biometric proof:', error);
      isValidProof = false;
    }

    if (!isValidProof) {
      logger.info(`Biometric proof verification: FAILED`);
      logger.warn(`Invalid biometric proof for scholar ${scholarId}`);
      return res.status(401).json({
        success: false,
        error: 'Fingerprint verification failed. Please use your enrolled fingerprint.',
        code: 'BIOMETRIC_VERIFICATION_FAILED'
      });
    }

    logger.info(`Biometric proof verification: PASSED`);

    // Get organization for settings
    const organization = await Organization.findById(organizationId);

    // Validate location if required
    let locationValid = true;
    if (organization.settings.requireLocation && location) {
      try {
        locationValid = await locationService.validateLocation(
          location,
          organization.campus
        );

        if (!locationValid) {
          logger.warn(`Scholar ${scholarId} outside campus boundaries`);
          return res.status(400).json({
            success: false,
            error: 'You must be within campus boundaries to mark attendance',
            code: 'OUTSIDE_CAMPUS'
          });
        }
      } catch (error) {
        logger.warn('Location validation error:', error);
        // Continue if location validation fails in development
        if (process.env.NODE_ENV === 'production') {
          return res.status(400).json({
            success: false,
            error: 'Location validation failed',
            code: 'LOCATION_ERROR'
          });
        }
      }
    }

    // Check working hours
    try {
      const workingHoursValid = locationService.validateWorkingHours(
        organization.settings.workingHours
      );

      if (!workingHoursValid && process.env.NODE_ENV === 'production') {
        return res.status(400).json({
          success: false,
          error: 'Attendance can only be marked during working hours',
          code: 'OUTSIDE_WORKING_HOURS'
        });
      }
    } catch (error) {
      logger.warn('Working hours validation error:', error);
    }

    // Check for duplicate attendance
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

    // Generate attendance proof
    const attendanceProof = await zkpService.generateAttendanceProof(
      scholar._id.toString(),
      biometricProof,
      Date.now()
    );

    // Create attendance record
    const attendance = new Attendance({
      scholarId: scholar._id,
      organizationId,
      date: new Date(),
      attendanceType,
      status: 'present',
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
      deviceInfo: deviceInfo || {},
      metadata: {
        checkInTime: attendanceType === 'checkIn' ? new Date() : undefined,
        checkOutTime: attendanceType === 'checkOut' ? new Date() : undefined,
        isLate: false, // Calculate based on org settings
        biometricVerified: true
      }
    });

    await attendance.save();

    // Update scholar stats
    if (attendanceType === 'checkIn') {
      await scholar.updateAttendanceStats();
    }

    logger.info(`Attendance marked successfully for scholar ${scholarId}`);

    res.json({
      success: true,
      message: `${attendanceType === 'checkIn' ? 'Check-in' : 'Check-out'} marked successfully`,
      attendance: {
        id: attendance._id,
        markedAt: attendance.date,
        type: attendanceType,
        status: attendance.status,
        proofId: attendanceProof.proofId,
        locationValid,
        biometricVerified: true
      }
    });

  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark attendance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get today's attendance for a scholar
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const scholarId = req.user.scholarId;

    const scholar = await Scholar.findById(userId);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await Attendance.findOne({
      scholarId: scholar._id,
      date: { $gte: today },
      attendanceType: 'checkIn'
    });

    const checkOut = await Attendance.findOne({
      scholarId: scholar._id,
      date: { $gte: today },
      attendanceType: 'checkOut'
    });

    res.json({
      success: true,
      attendance: {
        checkIn: checkIn ? checkIn.date : null,
        checkOut: checkOut ? checkOut.date : null,
        status: checkIn ? 'present' : 'absent',
        checkInProofId: checkIn?.proofData?.zkProof?.proofId,
        checkOutProofId: checkOut?.proofData?.zkProof?.proofId
      }
    });

  } catch (error) {
    logger.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today\'s attendance'
    });
  }
};

// Get attendance history for a scholar
export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 30, page = 1 } = req.query;

    const scholar = await Scholar.findById(userId);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Build query
    const query = { scholarId: scholar._id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get attendance records
    const skip = (page - 1) * limit;
    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('date attendanceType status proofData.zkProof.proofId metadata.biometricVerified');

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      attendance: attendance.map(record => ({
        id: record._id,
        date: record.date,
        type: record.attendanceType,
        status: record.status,
        proofId: record.proofData.zkProof.proofId,
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

// Verify attendance proof
export const verifyAttendanceProof = async (req, res) => {
  try {
    const { proofId } = req.params;

    const attendance = await Attendance.findOne({ 
      'proofData.zkProof.proofId': proofId 
    })
    .populate('scholarId', 'scholarId personalInfo.name')
    .populate('organizationId', 'name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance proof not found'
      });
    }

    // Verify the proof
    const isValid = await zkpService.verifyAttendanceProof(
      attendance.proofData.zkProof
    );

    res.json({
      success: true,
      valid: isValid,
      attendance: {
        scholarName: attendance.scholarId.personalInfo.name,
        scholarId: attendance.scholarId.scholarId,
        organization: attendance.organizationId.name,
        date: attendance.date,
        type: attendance.attendanceType,
        status: attendance.status,
        biometricVerified: attendance.metadata.biometricVerified
      }
    });

  } catch (error) {
    logger.error('Verify attendance proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify attendance proof'
    });
  }
};

// Get attendance statistics
export const getAttendanceStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const scholar = await Scholar.findById(userId);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Build date range
    const startDate = new Date(year || new Date().getFullYear(), month || 0, 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // Get attendance stats
    const attendance = await Attendance.aggregate([
      {
        $match: {
          scholarId: scholar._id,
          date: { $gte: startDate, $lte: endDate },
          attendanceType: 'checkIn'
        }
      },
      {
        $group: {
          _id: null,
          totalPresent: { $sum: 1 },
          dates: { $push: '$date' }
        }
      }
    ]);

    const stats = attendance[0] || { totalPresent: 0, dates: [] };
    const totalWorkingDays = 22; // This should be calculated based on calendar

    res.json({
      success: true,
      stats: {
        totalPresent: stats.totalPresent,
        totalAbsent: totalWorkingDays - stats.totalPresent,
        totalWorkingDays,
        attendancePercentage: Math.round((stats.totalPresent / totalWorkingDays) * 100),
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear()
      }
    });

  } catch (error) {
    logger.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attendance statistics'
    });
  }
};