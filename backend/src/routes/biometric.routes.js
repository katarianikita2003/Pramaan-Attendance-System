// backend/src/routes/biometric.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import Scholar from '../models/Scholar.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Biometric routes working' });
});

// Enroll biometric commitment
router.post('/enroll', authenticateToken, async (req, res) => {
  try {
    const { commitment, biometricType } = req.body;
    const scholarId = req.user.scholarId;

    console.log('Enrolling biometric for scholar:', scholarId, 'Type:', biometricType);

    // Find scholar
    const scholar = await Scholar.findOne({ scholarId });
    if (!scholar) {
      return res.status(404).json({ 
        success: false, 
        error: 'Scholar not found' 
      });
    }

    // Initialize biometricEnrollment if it doesn't exist
    if (!scholar.biometricEnrollment) {
      scholar.biometricEnrollment = {
        fingerprint: { isActive: false },
        face: { isActive: false }
      };
    }

    // Store biometric commitment
    scholar.biometricEnrollment[biometricType] = {
      commitment,
      enrolledAt: new Date(),
      isActive: true
    };

    scholar.isBiometricEnrolled = true;
    
    // Also update the old biometrics field for backward compatibility
    if (biometricType === 'fingerprint') {
      scholar.biometrics.fingerprintEnrolled = true;
      scholar.biometrics.fingerprintCommitment = commitment;
    } else if (biometricType === 'face') {
      scholar.biometrics.faceEnrolled = true;
      scholar.biometrics.faceCommitment = commitment;
    }
    scholar.biometrics.isEnrolled = true;
    scholar.biometrics.enrolledAt = new Date();

    await scholar.save();

    console.log('Biometric enrolled successfully for scholar:', scholarId);

    res.json({
      success: true,
      message: 'Biometric enrolled successfully',
      enrollmentStatus: {
        [biometricType]: true
      }
    });
  } catch (error) {
    console.error('Biometric enrollment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to enroll biometric',
      details: error.message
    });
  }
});

// Check enrollment status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const scholarId = req.user.scholarId;
    console.log('Checking biometric status for scholar:', scholarId);

    const scholar = await Scholar.findOne({ scholarId });
    
    if (!scholar) {
      return res.status(404).json({ 
        success: false, 
        error: 'Scholar not found' 
      });
    }

    // Check both new and old enrollment fields for compatibility
    const enrollmentStatus = {
      isEnrolled: scholar.isBiometricEnrolled || scholar.biometrics?.isEnrolled || false,
      hasFingerprint: scholar.biometricEnrollment?.fingerprint?.isActive || scholar.biometrics?.fingerprintEnrolled || false,
      hasFace: scholar.biometricEnrollment?.face?.isActive || scholar.biometrics?.faceEnrolled || false
    };

    console.log('Enrollment status:', enrollmentStatus);

    res.json({
      success: true,
      enrollmentStatus
    });
  } catch (error) {
    console.error('Error checking enrollment status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check enrollment status',
      details: error.message
    });
  }
});

export default router;