// ===== backend/src/routes/attendance.routes.js =====
import express from 'express';
import { body, validationResult } from 'express-validator';
import AttendanceProof from '../models/AttendanceProof.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { ZKPService } from '../services/zkp.service.js';
import { CertificateService } from '../services/certificate.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const zkpService = new ZKPService();
const certificateService = new CertificateService();

// Generate attendance proof
router.post('/generate-proof',
  [
    body('scholarId').notEmpty(),
    body('organizationCode').notEmpty(),
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
      
      const { scholarId, organizationCode, biometricData, location } = req.body;
      
      // Find organization
      const organization = await Organization.findOne({ 
        code: organizationCode.toUpperCase(),
        isActive: true
      });
      
      if (!organization) {
        return res.status(404).json({ error: 'Invalid organization code' });
      }
      
      // Find scholar
      const scholar = await Scholar.findOne({
        organizationId: organization._id,
        scholarId: scholarId.toUpperCase(),
        'status.isActive': true
      });
      
      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }
      
      // Check if eligible for attendance
      if (!scholar.isEligibleForAttendance()) {
        return res.status(403).json({ error: 'Not eligible for attendance' });
      }
      
      // Verify location
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        organization.settings.locationBounds.center.latitude,
        organization.settings.locationBounds.center.longitude
      );
      
      if (distance > organization.settings.locationBounds.radius) {
        return res.status(400).json({ 
          error: 'Location outside campus bounds',
          details: {
            distance: Math.round(distance),
            maxRadius: organization.settings.locationBounds.radius
          }
        });
      }
      
      // Generate ZKP proof
      const proof = await zkpService.generateAttendanceProof({
        biometricData,
        commitment: scholar.biometricData.commitments.combined,
        scholarId: scholar._id.toString(),
        organizationId: organization._id.toString(),
        location,
        timestamp: Math.floor(Date.now() / 1000)
      });
      
      // Verify the proof
      const isValid = await zkpService.verifyProof(proof.proof, proof.publicSignals);
      if (!isValid) {
        return res.status(400).json({ error: 'Proof verification failed' });
      }
      
      // Check for existing attendance today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingAttendance = await AttendanceProof.findOne({
        scholarId: scholar._id,
        date: { $gte: today }
      });
      
      let attendanceProof;
      
      if (existingAttendance && !existingAttendance.checkOut) {
        // This is a check-out
        existingAttendance.checkOut = {
          timestamp: new Date(),
          location,
          zkProof: {
            proof: proof.proof,
            publicSignals: proof.publicSignals,
            proofHash: proof.proofHash,
            generationTime: proof.generationTime
          }
        };
        
        existingAttendance.calculateDuration();
        await existingAttendance.save();
        
        attendanceProof = existingAttendance;
      } else if (existingAttendance && existingAttendance.checkOut) {
        return res.status(400).json({ error: 'Attendance already marked for today' });
      } else {
        // This is a check-in
        attendanceProof = new AttendanceProof({
          scholarId: scholar._id,
          organizationId: organization._id,
          date: new Date(),
          checkIn: {
            timestamp: new Date(),
            location,
            zkProof: {
              proof: proof.proof,
              publicSignals: proof.publicSignals,
              proofHash: proof.proofHash,
              generationTime: proof.generationTime
            },
            deviceInfo: {
              model: req.headers['x-device-model'],
              os: req.headers['x-device-os'],
              appVersion: req.headers['x-app-version']
            },
            biometricTypes: ['fingerprint', 'face'],
            verificationStatus: 'verified'
          }
        });
        
        // Check if late
        attendanceProof.checkFlags(organization.settings);
        
        await attendanceProof.save();
        
        // Update scholar stats
        scholar.updateAttendanceStats(attendanceProof.status);
        await scholar.save();
      }
      
      // Generate certificate
      const certificate = await certificateService.generateAttendanceCertificate(
        attendanceProof,
        scholar,
        organization
      );
      
      res.json({
        message: existingAttendance ? 'Checked out successfully' : 'Checked in successfully',
        proof: {
          id: attendanceProof._id,
          type: existingAttendance ? 'check-out' : 'check-in',
          timestamp: existingAttendance ? attendanceProof.checkOut.timestamp : attendanceProof.checkIn.timestamp,
          proofHash: proof.proofHash,
          certificateUrl: certificate.url
        }
      });
    } catch (error) {
      logger.error('Proof generation error:', error);
      res.status(500).json({ error: 'Failed to generate attendance proof' });
    }
  }
);

// Get attendance history
router.get('/history/:scholarId', authenticateToken, async (req, res) => {
  try {
    const { scholarId } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    
    // Verify access
    if (req.user.role === 'scholar' && req.user.scholarId !== scholarId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const query = { scholarId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const attendance = await AttendanceProof.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('organizationId', 'name code');
    
    const total = await AttendanceProof.countDocuments(query);
    
    res.json({
      attendance: attendance.map(record => ({
        id: record._id,
        date: record.date,
        checkIn: record.checkIn?.timestamp,
        checkOut: record.checkOut?.timestamp,
        duration: record.duration,
        status: record.status,
        certificates: record.certificates
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// Download certificate
router.get('/certificate/:id', async (req, res) => {
  try {
    const proof = await AttendanceProof.findById(req.params.id)
      .populate('scholarId')
      .populate('organizationId');
    
    if (!proof) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    const certificate = await certificateService.generateAttendanceCertificate(
      proof,
      proof.scholarId,
      proof.organizationId
    );
    
    res.sendFile(certificate.filePath);
  } catch (error) {
    logger.error('Certificate download error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

export default router;