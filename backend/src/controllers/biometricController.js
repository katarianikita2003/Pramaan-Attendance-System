// backend/src/controllers/biometricController.js
import BiometricCommitment from '../models/BiometricCommitment.js';
import Scholar from '../models/Scholar.js';
import { zkpService } from '../services/zkp.service.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export const enrollBiometric = async (req, res) => {
  try {
    const { scholarId, biometricData } = req.body;
    const organizationId = req.user.organizationId;

    logger.info(`Biometric enrollment attempt for scholar: ${scholarId}`);

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

    // Generate ZKP commitments using the correct method name
    let faceCommitment = null;
    let fingerprintCommitment = null;

    if (biometricData.faceImage || biometricData.faceCommitment) {
      // Use commitment from client if provided, otherwise generate
      const commitment = biometricData.faceCommitment?.commitment || 
                        biometricData.faceCommitment || // Handle string commitment
                        await zkpService.generateBiometricCommitment({ 
                          type: 'face', 
                          data: biometricData.faceImage 
                        });
      
      const hash = crypto.createHash('sha256')
                        .update(commitment)
                        .digest('hex');
      
      faceCommitment = { commitment, hash };
    }
    
    if (biometricData.fingerprintTemplate || biometricData.fingerprintCommitment) {
      // Use commitment from client if provided, otherwise generate
      const commitment = biometricData.fingerprintCommitment?.commitment || 
                        biometricData.fingerprintCommitment || // Handle string commitment
                        await zkpService.generateBiometricCommitment({ 
                          type: 'fingerprint', 
                          data: biometricData.fingerprintTemplate 
                        });
      
      const hash = crypto.createHash('sha256')
                        .update(commitment)
                        .digest('hex');
      
      fingerprintCommitment = { commitment, hash };
    }

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

    logger.info(`Biometric enrolled successfully for scholar: ${scholarId}`);

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

    logger.info(`Checking enrollment for scholar: ${scholarId}`);

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