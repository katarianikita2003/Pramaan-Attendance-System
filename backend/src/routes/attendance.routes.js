// backend/src/routes/attendance.routes.js
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import Scholar from '../models/Scholar.js';
import Campus from '../models/Campus.js';
import { zkpService } from '../services/zkp.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Mark attendance - for scholars
router.post('/mark', authenticateToken, requireRole('scholar'), async (req, res) => {
  try {
    const { scholarId, location, biometricType, timestamp } = req.body;
    
    // Verify the scholar is marking their own attendance
    if (req.user.scholarId !== scholarId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to mark attendance for another scholar'
      });
    }

    // Check if attendance already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await AttendanceRecord.findOne({
      scholar: req.user.id,
      markedAt: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Attendance already marked for today',
        attendance: existingAttendance
      });
    }

    // Get scholar details
    const scholar = await Scholar.findById(req.user.id).populate('organizationId');
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Verify location (simplified for now - can be enhanced with actual geofencing)
    const campus = await Campus.findOne({ organization: scholar.organizationId });
    let locationValid = true;
    
    if (campus && campus.boundaries && location) {
      // Simple distance check - can be enhanced with proper geofencing
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        campus.boundaries.center.lat,
        campus.boundaries.center.lng
      );
      
      locationValid = distance <= (campus.boundaries.radius || 500); // 500m default radius
    }

    // Generate ZKP proof
    let zkpProof;
    let proofId;
    
    try {
      // Check if ZKP service is properly initialized
      if (zkpService && zkpService.isInitialized && zkpService.isInitialized()) {
        const proofData = await zkpService.generateAttendanceProof({
          scholarId: scholar.scholarId,
          biometricCommitment: scholar.biometrics?.[biometricType + 'Commitment'] || 'simulated-commitment',
          timestamp: new Date().toISOString(),
          location: location
        });
        
        zkpProof = proofData.proof;
        proofId = proofData.proofId;
      } else {
        // Use simulated proof if ZKP service is not initialized
        logger.warn('ZKP Service not initialized, using simulated proof');
        zkpProof = {
          type: 'simulated',
          commitment: 'simulated-commitment-' + Date.now(),
          timestamp: new Date().toISOString()
        };
        proofId = 'PROOF-SIM-' + Date.now().toString(36).toUpperCase();
      }
    } catch (zkpError) {
      logger.error('ZKP generation error:', zkpError);
      // Continue with simulated proof
      zkpProof = {
        type: 'simulated',
        commitment: 'simulated-commitment-' + Date.now(),
        timestamp: new Date().toISOString()
      };
      proofId = 'PROOF-SIM-' + Date.now().toString(36).toUpperCase();
    }

    // Create attendance record
    const attendanceRecord = new AttendanceRecord({
      scholar: scholar._id,
      organization: scholar.organizationId,
      markedAt: new Date(),
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      } : undefined,
      locationValid,
      biometricType: biometricType || 'simulated',
      zkpProof,
      proofId,
      status: 'present',
      verificationMethod: zkpProof.type === 'simulated' ? 'simulated' : 'zkp'
    });

    await attendanceRecord.save();

    // Update scholar stats
    await Scholar.findByIdAndUpdate(scholar._id, {
      $inc: { 'stats.totalPresent': 1 },
      $set: { 'stats.lastAttendance': new Date() }
    });

    logger.info(`Attendance marked for scholar ${scholarId}`);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        id: attendanceRecord._id,
        markedAt: attendanceRecord.markedAt,
        status: attendanceRecord.status,
        proofId: attendanceRecord.proofId,
        locationValid: attendanceRecord.locationValid,
        verificationMethod: attendanceRecord.verificationMethod,
        timestamp: attendanceRecord.markedAt
      }
    });

  } catch (error) {
    logger.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark attendance',
      details: error.message
    });
  }
});

// Get today's attendance for a scholar
router.get('/today', authenticateToken, requireRole('scholar'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await AttendanceRecord.findOne({
      scholar: req.user.id,
      markedAt: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'No attendance record found for today',
        attendance: null
      });
    }

    res.json({
      success: true,
      attendance: {
        id: attendance._id,
        markedAt: attendance.markedAt,
        status: attendance.status,
        proofId: attendance.proofId,
        locationValid: attendance.locationValid,
        verificationMethod: attendance.verificationMethod
      }
    });

  } catch (error) {
    logger.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s attendance'
    });
  }
});

// Verify attendance proof
router.get('/verify/:proofId', async (req, res) => {
  try {
    const { proofId } = req.params;

    const attendance = await AttendanceRecord.findOne({ proofId })
      .populate('scholar', 'scholarId personalInfo.name')
      .populate('organization', 'name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Invalid proof ID'
      });
    }

    // Verify the proof
    let isValid = true;
    if (attendance.verificationMethod === 'zkp' && zkpService.isInitialized && zkpService.isInitialized()) {
      try {
        isValid = await zkpService.verifyProof(attendance.zkpProof);
      } catch (error) {
        logger.error('Proof verification error:', error);
        isValid = false;
      }
    }

    res.json({
      success: true,
      valid: isValid,
      attendance: {
        scholarId: attendance.scholar.scholarId,
        scholarName: attendance.scholar.personalInfo.name,
        organization: attendance.organization.name,
        markedAt: attendance.markedAt,
        status: attendance.status,
        verificationMethod: attendance.verificationMethod
      }
    });

  } catch (error) {
    logger.error('Verify attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify attendance proof'
    });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

export default router;