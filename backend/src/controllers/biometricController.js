// backend/src/controllers/biometric.controller.js
import Scholar from '../models/Scholar.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// Check biometric enrollment status
export const checkBiometricStatus = async (req, res) => {
  try {
    const scholarId = req.user.scholarId;
    
    logger.info(`Checking biometric status for scholar: ${scholarId}`);

    const scholar = await Scholar.findById(req.user.id);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Check if biometric commitment exists
    const biometricCommitment = await BiometricCommitment.findOne({
      userId: scholar._id,
      isActive: true
    });

    const enrollmentStatus = {
      isEnrolled: !!biometricCommitment,
      hasFingerprint: !!biometricCommitment?.commitments?.fingerprint?.hash,
      hasFace: !!biometricCommitment?.commitments?.face?.hash
    };

    logger.info(`Enrollment status: ${JSON.stringify(enrollmentStatus)}`);

    res.json({
      success: true,
      enrollmentStatus
    });
  } catch (error) {
    logger.error('Error checking biometric status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check biometric status'
    });
  }
};

// Enroll biometric
export const enrollBiometric = async (req, res) => {
  try {
    const { biometricData, biometricType, commitment } = req.body;
    const scholarId = req.user.scholarId;
    const organizationId = req.user.organizationId;

    logger.info(`Biometric enrollment request for scholar: ${scholarId}`);

    // Handle different request formats
    let enrollmentData = biometricData || {};
    
    // If old format with commitment and biometricType
    if (commitment && biometricType && !biometricData) {
      enrollmentData = {
        [`${biometricType}Template`]: commitment
      };
    }
    
    // Check for fingerprint or face data in various formats
    const hasFingerprintData = enrollmentData.fingerprintTemplate || 
                              enrollmentData.fingerprintCommitment || 
                              enrollmentData.fingerprint ||
                              (biometricType === 'fingerprint' && commitment);
                              
    const hasFaceData = enrollmentData.faceTemplate || 
                       enrollmentData.faceCommitment || 
                       enrollmentData.face ||
                       (biometricType === 'face' && commitment);

    if (!hasFingerprintData && !hasFaceData) {
      return res.status(400).json({
        success: false,
        error: 'Biometric data is required'
      });
    }

    const scholar = await Scholar.findById(req.user.id);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Check if already enrolled
    let existingCommitment = await BiometricCommitment.findOne({
      userId: scholar._id,
      isActive: true
    });

    // Generate commitments with salt for each biometric type
    let faceCommitment, fingerprintCommitment;

    if (hasFaceData) {
      // Get the face data from various possible fields
      const faceTemplateData = enrollmentData.faceTemplate || 
                              enrollmentData.faceCommitment || 
                              enrollmentData.face ||
                              commitment;
      
      // Generate random salt for face biometric
      const faceSalt = crypto.randomBytes(32).toString('hex');
      
      // Create commitment string that includes the template and salt
      const faceDataString = JSON.stringify({
        template: faceTemplateData,
        salt: faceSalt,
        timestamp: Date.now()
      });
      
      // Generate hash of the commitment
      const faceHash = crypto.createHash('sha256')
        .update(faceDataString)
        .digest('hex');
      
      faceCommitment = {
        commitment: faceDataString,
        hash: faceHash,
        salt: faceSalt,
        timestamp: new Date()
      };
    }

    if (hasFingerprintData) {
      // Get the fingerprint data from various possible fields
      const fingerprintTemplateData = enrollmentData.fingerprintTemplate || 
                                     enrollmentData.fingerprintCommitment || 
                                     enrollmentData.fingerprint ||
                                     commitment;
      
      // Generate random salt for fingerprint biometric
      const fingerprintSalt = crypto.randomBytes(32).toString('hex');
      
      // Create commitment string that includes the template and salt
      const fingerprintDataString = JSON.stringify({
        template: fingerprintTemplateData,
        salt: fingerprintSalt,
        timestamp: Date.now()
      });
      
      // Generate hash of the commitment
      const fingerprintHash = crypto.createHash('sha256')
        .update(fingerprintDataString)
        .digest('hex');
      
      fingerprintCommitment = {
        commitment: fingerprintDataString,
        hash: fingerprintHash,
        salt: fingerprintSalt,
        timestamp: new Date()
      };
    }

    // Check for global uniqueness
    if (faceCommitment && !existingCommitment) {
      const faceExists = await BiometricCommitment.findOne({
        'commitments.face.hash': faceCommitment.hash,
        isActive: true,
        userId: { $ne: scholar._id }
      });
      if (faceExists) {
        return res.status(409).json({
          success: false,
          error: 'Face biometric already registered in the system'
        });
      }
    }

    if (fingerprintCommitment && !existingCommitment) {
      const fingerprintExists = await BiometricCommitment.findOne({
        'commitments.fingerprint.hash': fingerprintCommitment.hash,
        isActive: true,
        userId: { $ne: scholar._id }
      });
      if (fingerprintExists) {
        return res.status(409).json({
          success: false,
          error: 'Fingerprint biometric already registered in the system'
        });
      }
    }

    // Create or update biometric commitment record
    if (existingCommitment) {
      // Update existing commitment
      if (faceCommitment) {
        existingCommitment.commitments.face = faceCommitment;
      }
      if (fingerprintCommitment) {
        existingCommitment.commitments.fingerprint = fingerprintCommitment;
      }
      existingCommitment.updatedAt = new Date();
      await existingCommitment.save();
    } else {
      // Create new commitment
      const biometricCommitment = new BiometricCommitment({
        userId: scholar._id,
        userType: 'Scholar', // Capital S to match enum
        organizationId,
        commitments: {
          face: faceCommitment || undefined,
          fingerprint: fingerprintCommitment || undefined
        },
        isActive: true
      });
      await biometricCommitment.save();
      existingCommitment = biometricCommitment;
    }

    // Update scholar biometric enrollment status
    scholar.biometrics = {
      isEnrolled: true,
      enrolledAt: new Date(),
      faceEnrolled: !!faceCommitment || !!existingCommitment.commitments?.face?.hash,
      fingerprintEnrolled: !!fingerprintCommitment || !!existingCommitment.commitments?.fingerprint?.hash
    };
    
    // Also update for backward compatibility
    if (!scholar.biometricEnrollment) {
      scholar.biometricEnrollment = {
        fingerprint: { isActive: false },
        face: { isActive: false }
      };
    }
    
    if (faceCommitment || existingCommitment.commitments?.face) {
      scholar.biometricEnrollment.face = {
        commitment: existingCommitment.commitments.face.commitment,
        enrolledAt: new Date(),
        isActive: true
      };
    }
    
    if (fingerprintCommitment || existingCommitment.commitments?.fingerprint) {
      scholar.biometricEnrollment.fingerprint = {
        commitment: existingCommitment.commitments.fingerprint.commitment,
        enrolledAt: new Date(),
        isActive: true
      };
    }
    
    scholar.isBiometricEnrolled = true;
    await scholar.save();

    logger.info(`Biometric enrolled successfully for scholar: ${scholarId}`);

    res.json({
      success: true,
      message: 'Biometric enrolled successfully',
      enrollmentStatus: {
        isEnrolled: true,
        hasFingerprint: !!existingCommitment.commitments?.fingerprint?.hash,
        hasFace: !!existingCommitment.commitments?.face?.hash
      }
    });

  } catch (error) {
    logger.error('Biometric enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll biometric',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify biometric
export const verifyBiometric = async (req, res) => {
  try {
    const { biometricData, type } = req.body;
    const scholarId = req.user.scholarId;

    logger.info(`Biometric verification request for scholar: ${scholarId}, type: ${type}`);

    if (!biometricData || !type) {
      return res.status(400).json({
        success: false,
        error: 'Biometric data and type are required'
      });
    }

    const scholar = await Scholar.findById(req.user.id);
    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Get biometric commitment
    const biometricCommitment = await BiometricCommitment.findOne({
      userId: scholar._id,
      isActive: true
    });

    if (!biometricCommitment) {
      return res.status(400).json({
        success: false,
        error: 'No biometric enrolled for this scholar'
      });
    }

    // Check if the requested biometric type is enrolled
    const biometricTypeData = biometricCommitment.commitments[type];
    if (!biometricTypeData || !biometricTypeData.hash) {
      return res.status(400).json({
        success: false,
        error: `${type} biometric not enrolled`
      });
    }

    // For simulation, we'll just check if the biometric was provided
    // In production, this would do actual biometric matching
    const isVerified = !!biometricData;

    if (isVerified) {
      logger.info(`Biometric verification successful for scholar: ${scholarId}`);
      res.json({
        success: true,
        verified: true,
        message: 'Biometric verified successfully'
      });
    } else {
      logger.warn(`Biometric verification failed for scholar: ${scholarId}`);
      res.status(403).json({
        success: false,
        verified: false,
        error: 'Biometric verification failed'
      });
    }

  } catch (error) {
    logger.error('Biometric verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify biometric'
    });
  }
};

export default {
  checkBiometricStatus,
  enrollBiometric,
  verifyBiometric
};