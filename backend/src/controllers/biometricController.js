// backend/src/controllers/biometricController.js
import BiometricCommitment from '../models/BiometricCommitment.js';
import Scholar from '../models/Scholar.js';
import { zkpService } from '../services/zkp.service.js';
import logger from '../utils/logger.js';

export const enrollBiometric = async (req, res) => {
  try {
    const { scholarId, biometricData } = req.body;
    const organizationId = req.user.organizationId;

    // Find the scholar
    const scholar = await Scholar.findOne({ 
      scholarId: scholarId.toUpperCase(), 
      organizationId 
    });

    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    // Check if biometric already enrolled
    const existingCommitment = await BiometricCommitment.findByUserId(scholar._id);
    if (existingCommitment) {
      return res.status(400).json({
        success: false,
        error: 'Biometric already enrolled for this scholar'
      });
    }

    // Generate ZKP commitments
    const faceCommitment = biometricData.faceImage 
      ? await zkpService.generateCommitment(biometricData.faceImage)
      : null;
    
    const fingerprintCommitment = biometricData.fingerprintTemplate
      ? await zkpService.generateCommitment(biometricData.fingerprintTemplate)
      : null;

    // Check for global uniqueness
    if (faceCommitment) {
      const faceExists = await BiometricCommitment.findByHash(faceCommitment.hash, 'face');
      if (faceExists) {
        return res.status(409).json({
          success: false,
          error: 'Face biometric already registered in the system'
        });
      }
    }

    if (fingerprintCommitment) {
      const fingerprintExists = await BiometricCommitment.findByHash(fingerprintCommitment.hash, 'fingerprint');
      if (fingerprintExists) {
        return res.status(409).json({
          success: false,
          error: 'Fingerprint biometric already registered in the system'
        });
      }
    }

    // Create biometric commitment record
    const biometricCommitment = new BiometricCommitment({
      userId: scholar._id,
      userType: 'scholar',
      organizationId,
      commitments: {
        face: faceCommitment ? {
          commitment: faceCommitment.commitment,
          hash: faceCommitment.hash,
          timestamp: new Date()
        } : undefined,
        fingerprint: fingerprintCommitment ? {
          commitment: fingerprintCommitment.commitment,
          hash: fingerprintCommitment.hash,
          timestamp: new Date()
        } : undefined
      }
    });

    await biometricCommitment.save();

    // Update scholar biometric enrollment status
    scholar.biometrics = {
      isEnrolled: true,
      enrolledAt: new Date(),
      faceEnrolled: !!faceCommitment,
      fingerprintEnrolled: !!fingerprintCommitment
    };
    await scholar.save();

    logger.info(`Biometric enrolled for scholar: ${scholarId}`);

    res.json({
      success: true,
      message: 'Biometric enrolled successfully',
      zkProof: {
        scholarId: scholar.scholarId,
        enrollmentHash: biometricCommitment._id,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Biometric enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enroll biometric'
    });
  }
};

export const checkEnrollment = async (req, res) => {
  try {
    const { scholarId } = req.params;
    const organizationId = req.user.organizationId;

    const scholar = await Scholar.findOne({ 
      scholarId: scholarId.toUpperCase(), 
      organizationId 
    });

    if (!scholar) {
      return res.status(404).json({
        success: false,
        error: 'Scholar not found'
      });
    }

    const biometricCommitment = await BiometricCommitment.findByUserId(scholar._id);

    res.json({
      success: true,
      enrolled: !!biometricCommitment,
      enrollmentDetails: biometricCommitment ? {
        faceEnrolled: !!biometricCommitment.commitments.face,
        fingerprintEnrolled: !!biometricCommitment.commitments.fingerprint,
        enrolledAt: biometricCommitment.createdAt
      } : null
    });

  } catch (error) {
    logger.error('Enrollment check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check enrollment status'
    });
  }
};