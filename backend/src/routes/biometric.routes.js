// backend/src/routes/biometric.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import Scholar from '../models/Scholar.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Biometric routes working' });
});

// Enroll biometric commitment
router.post('/enroll', authenticateToken, async (req, res) => {
  try {
    const { commitment, biometricType, biometricData } = req.body;
    const scholarId = req.user.scholarId;
    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    console.log('Enrolling biometric for scholar:', scholarId, 'Type:', biometricType);

    // Find scholar
    const scholar = await Scholar.findById(userId);
    if (!scholar) {
      return res.status(404).json({ 
        success: false, 
        error: 'Scholar not found' 
      });
    }

    // Check if BiometricCommitment already exists
    let biometricRecord = await BiometricCommitment.findOne({ 
      userId: scholar._id,
      isActive: true 
    });

    // If no record exists, create new one
    if (!biometricRecord) {
      biometricRecord = new BiometricCommitment({
        userId: scholar._id,
        userType: 'scholar',
        organizationId: organizationId,
        commitments: {
          face: {},
          fingerprint: {}
        },
        isActive: true
      });
    }

    // Prepare commitment data
    let commitmentValue = commitment;
    let hashValue = '';

    // Handle different enrollment data formats
    if (biometricData) {
      if (biometricData.fingerprintCommitment && (biometricType === 'fingerprint' || !biometricType)) {
        commitmentValue = biometricData.fingerprintCommitment;
        hashValue = crypto.createHash('sha256').update(commitmentValue).digest('hex');
        
        biometricRecord.commitments.fingerprint = {
          commitment: commitmentValue,
          hash: hashValue,
          timestamp: new Date()
        };
      }
      
      if (biometricData.faceCommitment && (biometricType === 'face' || !biometricType)) {
        commitmentValue = biometricData.faceCommitment;
        hashValue = crypto.createHash('sha256').update(commitmentValue).digest('hex');
        
        biometricRecord.commitments.face = {
          commitment: commitmentValue,
          hash: hashValue,
          timestamp: new Date()
        };
      }
    } else if (commitment && biometricType) {
      // Handle single biometric enrollment
      hashValue = crypto.createHash('sha256').update(commitmentValue).digest('hex');
      
      if (biometricType === 'fingerprint') {
        biometricRecord.commitments.fingerprint = {
          commitment: commitmentValue,
          hash: hashValue,
          timestamp: new Date()
        };
      } else if (biometricType === 'face') {
        biometricRecord.commitments.face = {
          commitment: commitmentValue,
          hash: hashValue,
          timestamp: new Date()
        };
      }
    }

    // Save the BiometricCommitment record
    await biometricRecord.save();

    // Update Scholar model for backward compatibility
    if (!scholar.biometricEnrollment) {
      scholar.biometricEnrollment = {
        fingerprint: { isActive: false },
        face: { isActive: false }
      };
    }

    // Update based on what was enrolled
    if (biometricRecord.commitments.fingerprint && biometricRecord.commitments.fingerprint.hash) {
      scholar.biometricEnrollment.fingerprint = {
        commitment: biometricRecord.commitments.fingerprint.commitment,
        enrolledAt: new Date(),
        isActive: true
      };
      scholar.biometrics.fingerprintEnrolled = true;
      scholar.biometrics.fingerprintCommitment = biometricRecord.commitments.fingerprint.commitment;
    }

    if (biometricRecord.commitments.face && biometricRecord.commitments.face.hash) {
      scholar.biometricEnrollment.face = {
        commitment: biometricRecord.commitments.face.commitment,
        enrolledAt: new Date(),
        isActive: true
      };
      scholar.biometrics.faceEnrolled = true;
      scholar.biometrics.faceCommitment = biometricRecord.commitments.face.commitment;
    }

    scholar.isBiometricEnrolled = true;
    scholar.biometrics.isEnrolled = true;
    scholar.biometrics.enrolledAt = new Date();

    await scholar.save();

    console.log('Biometric enrolled successfully for scholar:', scholarId);
    logger.info(`Biometric enrollment successful - Scholar: ${scholarId}, BiometricCommitment ID: ${biometricRecord._id}`);

    res.json({
      success: true,
      message: 'Biometric enrolled successfully',
      enrollmentStatus: {
        fingerprint: !!biometricRecord.commitments.fingerprint.hash,
        face: !!biometricRecord.commitments.face.hash
      }
    });
  } catch (error) {
    console.error('Biometric enrollment error:', error);
    logger.error('Biometric enrollment error:', error);
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
    const userId = req.user.id;
    console.log('Checking biometric status for scholar:', scholarId);

    const scholar = await Scholar.findById(userId);
    
    if (!scholar) {
      return res.status(404).json({ 
        success: false, 
        error: 'Scholar not found' 
      });
    }

    // Check for BiometricCommitment record
    const biometricRecord = await BiometricCommitment.findOne({ 
      userId: scholar._id,
      isActive: true 
    });

    let enrollmentStatus = {
      isEnrolled: false,
      hasFingerprint: false,
      hasFace: false
    };

    if (biometricRecord) {
      enrollmentStatus = {
        isEnrolled: true,
        hasFingerprint: !!biometricRecord.commitments?.fingerprint?.hash,
        hasFace: !!biometricRecord.commitments?.face?.hash
      };
    } else {
      // Fallback to Scholar model for backward compatibility
      enrollmentStatus = {
        isEnrolled: scholar.isBiometricEnrolled || scholar.biometrics?.isEnrolled || false,
        hasFingerprint: scholar.biometricEnrollment?.fingerprint?.isActive || scholar.biometrics?.fingerprintEnrolled || false,
        hasFace: scholar.biometricEnrollment?.face?.isActive || scholar.biometrics?.faceEnrolled || false
      };
    }

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

// // backend/src/routes/biometric.routes.js
// import express from 'express';
// import { authenticateToken } from '../middleware/auth.middleware.js';
// import Scholar from '../models/Scholar.js';

// const router = express.Router();

// // Test route
// router.get('/test', (req, res) => {
//   res.json({ success: true, message: 'Biometric routes working' });
// });

// // Enroll biometric commitment
// router.post('/enroll', authenticateToken, async (req, res) => {
//   try {
//     const { commitment, biometricType } = req.body;
//     const scholarId = req.user.scholarId;

//     console.log('Enrolling biometric for scholar:', scholarId, 'Type:', biometricType);

//     // Find scholar
//     const scholar = await Scholar.findOne({ scholarId });
//     if (!scholar) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Scholar not found' 
//       });
//     }

//     // Initialize biometricEnrollment if it doesn't exist
//     if (!scholar.biometricEnrollment) {
//       scholar.biometricEnrollment = {
//         fingerprint: { isActive: false },
//         face: { isActive: false }
//       };
//     }

//     // Store biometric commitment
//     scholar.biometricEnrollment[biometricType] = {
//       commitment,
//       enrolledAt: new Date(),
//       isActive: true
//     };

//     scholar.isBiometricEnrolled = true;
    
//     // Also update the old biometrics field for backward compatibility
//     if (biometricType === 'fingerprint') {
//       scholar.biometrics.fingerprintEnrolled = true;
//       scholar.biometrics.fingerprintCommitment = commitment;
//     } else if (biometricType === 'face') {
//       scholar.biometrics.faceEnrolled = true;
//       scholar.biometrics.faceCommitment = commitment;
//     }
//     scholar.biometrics.isEnrolled = true;
//     scholar.biometrics.enrolledAt = new Date();

//     await scholar.save();

//     console.log('Biometric enrolled successfully for scholar:', scholarId);

//     res.json({
//       success: true,
//       message: 'Biometric enrolled successfully',
//       enrollmentStatus: {
//         [biometricType]: true
//       }
//     });
//   } catch (error) {
//     console.error('Biometric enrollment error:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to enroll biometric',
//       details: error.message
//     });
//   }
// });

// // Check enrollment status
// router.get('/status', authenticateToken, async (req, res) => {
//   try {
//     const scholarId = req.user.scholarId;
//     console.log('Checking biometric status for scholar:', scholarId);

//     const scholar = await Scholar.findOne({ scholarId });
    
//     if (!scholar) {
//       return res.status(404).json({ 
//         success: false, 
//         error: 'Scholar not found' 
//       });
//     }

//     // Check both new and old enrollment fields for compatibility
//     const enrollmentStatus = {
//       isEnrolled: scholar.isBiometricEnrolled || scholar.biometrics?.isEnrolled || false,
//       hasFingerprint: scholar.biometricEnrollment?.fingerprint?.isActive || scholar.biometrics?.fingerprintEnrolled || false,
//       hasFace: scholar.biometricEnrollment?.face?.isActive || scholar.biometrics?.faceEnrolled || false
//     };

//     console.log('Enrollment status:', enrollmentStatus);

//     res.json({
//       success: true,
//       enrollmentStatus
//     });
//   } catch (error) {
//     console.error('Error checking enrollment status:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to check enrollment status',
//       details: error.message
//     });
//   }
// });

// export default router;