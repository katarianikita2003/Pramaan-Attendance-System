// backend/src/routes/attendance.routes.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import AttendanceProof from '../models/AttendanceProof.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { ZKPService } from '../services/zkp.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const zkpService = new ZKPService();

// Mark attendance
router.post('/mark', 
  authenticateToken,
  [
    body('biometricData').notEmpty(),
    body('location').notEmpty(),
    body('location.latitude').isFloat(),
    body('location.longitude').isFloat()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const scholarId = req.user.id;
      const organizationId = req.user.organizationId;
      const { biometricData, location, timestamp } = req.body;

      // Get scholar details
      const scholar = await Scholar.findById(scholarId);
      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }

      // Check if attendance already marked today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingAttendance = await Attendance.findOne({
        scholarId: scholarId,
        date: { $gte: today, $lt: tomorrow }
      });

      if (existingAttendance) {
        return res.status(400).json({ 
          error: 'Attendance already marked for today' 
        });
      }

      // Verify location (simplified for now)
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Generate ZKP proof (simplified)
      const zkpProof = await zkpService.generateAttendanceProof({
        scholarId: scholar.scholarId,
        timestamp: new Date(),
        location,
        biometricType: biometricData.type
      });

      // Create attendance record
      const attendance = new Attendance({
        scholarId: scholarId,
        organizationId: organizationId,
        date: new Date(),
        checkIn: {
          time: new Date(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        },
        status: 'present',
        verificationMethod: biometricData.type,
        zkpProof: zkpProof.proofId
      });

      await attendance.save();

      // Create attendance proof
      const attendanceProof = new AttendanceProof({
        scholarId: scholarId,
        organizationId: organizationId,
        proofId: zkpProof.proofId,
        zkpProof: {
          proof: zkpProof.proof,
          publicInputs: zkpProof.publicInputs,
          timestamp: new Date()
        },
        checkIn: {
          timestamp: new Date(),
          location: {
            coordinates: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        },
        biometricType: biometricData.type,
        isVerified: true
      });

      await attendanceProof.save();

      // Update scholar stats
      await Scholar.findByIdAndUpdate(scholarId, {
        $inc: {
          'attendanceStats.totalPresent': 1,
          'attendanceStats.totalDays': 1
        },
        $set: {
          'attendanceStats.lastUpdated': new Date()
        }
      });

      res.json({
        success: true,
        message: 'Attendance marked successfully',
        proof: {
          id: zkpProof.proofId,
          timestamp: new Date(),
          status: 'verified'
        }
      });

    } catch (error) {
      logger.error('Mark attendance error:', error);
      res.status(500).json({ 
        error: 'Failed to mark attendance',
        details: error.message 
      });
    }
  }
);

// Get attendance history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const scholarId = req.user.id;
    const { page = 1, limit = 30 } = req.query;

    const attendanceHistory = await Attendance.find({ scholarId })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments({ scholarId });

    res.json({
      success: true,
      history: attendanceHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get attendance history error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// Verify attendance proof
router.get('/verify/:proofId', async (req, res) => {
  try {
    const { proofId } = req.params;

    const proof = await AttendanceProof.findOne({ proofId })
      .populate('scholarId', 'personalInfo.name scholarId')
      .populate('organizationId', 'name code');

    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    // Verify the proof
    const isValid = await zkpService.verifyProof(proof.zkpProof);

    res.json({
      success: true,
      valid: isValid,
      proof: {
        id: proof.proofId,
        scholar: proof.scholarId?.personalInfo?.name || 'Unknown',
        scholarId: proof.scholarId?.scholarId || 'Unknown',
        organization: proof.organizationId?.name || 'Unknown',
        timestamp: proof.checkIn.timestamp,
        verified: proof.isVerified
      }
    });
  } catch (error) {
    logger.error('Verify proof error:', error);
    res.status(500).json({ error: 'Failed to verify proof' });
  }
});

export default router;