// backend/src/controllers/scholar.controller.js - Updated registration method
import Scholar from '../models/Scholar.js';
import BiometricCommitment from '../models/BiometricCommitment.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

export const registerScholar = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      scholarId,
      personalInfo,
      academicInfo,
      password,
      biometrics,
      organizationId
    } = req.body;

    logger.info(`Registering new scholar: ${scholarId}`);

    // Use the organizationId from the request or from the admin's organization
    const orgId = organizationId || req.user.organizationId;

    // Check if scholar already exists
    const existingScholar = await Scholar.findOne({
      $or: [
        { scholarId: scholarId },
        { 'personalInfo.email': personalInfo.email }
      ]
    });

    if (existingScholar) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        error: 'Scholar with this ID or email already exists'
      });
    }

    // CRITICAL: Check biometric uniqueness globally
    if (biometrics) {
      // Check face biometric uniqueness
      if (biometrics.faceCommitment) {
        const faceUnique = await BiometricCommitment.checkUniqueness(
          biometrics.faceCommitment.commitment,
          'face'
        );
        
        if (!faceUnique) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            error: 'This face biometric is already registered in the system. One person cannot have multiple accounts.',
            code: 'BIOMETRIC_DUPLICATE_FACE'
          });
        }
      }

      // Check fingerprint biometric uniqueness
      if (biometrics.fingerprintCommitment) {
        const fingerprintUnique = await BiometricCommitment.checkUniqueness(
          biometrics.fingerprintCommitment.commitment,
          'fingerprint'
        );
        
        if (!fingerprintUnique) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            error: 'This fingerprint biometric is already registered in the system. One person cannot have multiple accounts.',
            code: 'BIOMETRIC_DUPLICATE_FINGERPRINT'
          });
        }
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new scholar
    const newScholar = new Scholar({
      scholarId: scholarId.toUpperCase(),
      personalInfo,
      academicInfo,
      organizationId: orgId,
      credentials: {
        passwordHash: hashedPassword
      },
      biometrics: {
        faceCommitment: biometrics?.faceCommitment?.commitment,
        fingerprintCommitment: biometrics?.fingerprintCommitment?.commitment,
        registeredAt: new Date()
      },
      status: 'active'
    });

    await newScholar.save({ session });

    // Register biometric commitments in global registry
    if (biometrics) {
      // Register face commitment
      if (biometrics.faceCommitment) {
        await BiometricCommitment.registerCommitment({
          commitment: biometrics.faceCommitment.commitment,
          nullifier: biometrics.faceCommitment.nullifier,
          type: 'face',
          scholarId: newScholar._id,
          organizationId: orgId,
          zkpParams: biometrics.faceCommitment.zkpParams,
          metadata: {
            deviceId: req.body.deviceId,
            appVersion: req.body.appVersion,
            platform: req.body.platform
          }
        }).session(session);
      }

      // Register fingerprint commitment
      if (biometrics.fingerprintCommitment) {
        await BiometricCommitment.registerCommitment({
          commitment: biometrics.fingerprintCommitment.commitment,
          nullifier: biometrics.fingerprintCommitment.nullifier,
          type: 'fingerprint',
          scholarId: newScholar._id,
          organizationId: orgId,
          zkpParams: biometrics.fingerprintCommitment.zkpParams,
          metadata: {
            deviceId: req.body.deviceId,
            appVersion: req.body.appVersion,
            platform: req.body.platform
          }
        }).session(session);
      }
    }

    await session.commitTransaction();
    logger.info(`Scholar registered successfully: ${scholarId}`);

    res.status(201).json({
      success: true,
      message: 'Scholar registered successfully with biometric protection',
      scholar: {
        id: newScholar._id,
        scholarId: newScholar.scholarId,
        name: newScholar.personalInfo.name,
        email: newScholar.personalInfo.email,
        department: newScholar.academicInfo.department,
        biometricsRegistered: {
          face: !!biometrics?.faceCommitment,
          fingerprint: !!biometrics?.fingerprintCommitment
        }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error('Scholar registration error:', error);
    
    // Handle specific biometric errors
    if (error.message.includes('Biometric already registered')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'BIOMETRIC_DUPLICATE'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to register scholar',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};