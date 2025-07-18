// backend/src/models/GlobalBiometricRegistry.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const globalBiometricSchema = new mongoose.Schema({
  // Biometric commitment hash (global unique index)
  commitmentHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Type of biometric
  biometricType: {
    type: String,
    required: true,
    enum: ['face', 'fingerprint', 'iris', 'voice'],
    index: true
  },
  
  // Nullifier to prevent double registration
  nullifier: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Organization where first registered
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Scholar/User who registered this biometric
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  
  userModel: {
    type: String,
    required: true,
    enum: ['Scholar', 'Employee', 'Admin']
  },
  
  // Registration metadata
  registrationMetadata: {
    deviceId: String,
    appVersion: String,
    platform: String,
    location: {
      type: { type: String },
      coordinates: [Number]
    },
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Security features
  securityFlags: {
    suspiciousActivity: { type: Boolean, default: false },
    multipleAttempts: { type: Number, default: 0 },
    lastAttemptedRegistration: Date,
    blockedUntil: Date
  },
  
  // Audit trail
  auditLog: [{
    action: String,
    timestamp: Date,
    organizationId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
globalBiometricSchema.index({ commitmentHash: 1, biometricType: 1 });
globalBiometricSchema.index({ nullifier: 1, organizationId: 1 });

// Static method to check if biometric exists globally
globalBiometricSchema.statics.checkBiometricExists = async function(commitmentHash, biometricType) {
  const existing = await this.findOne({ 
    commitmentHash, 
    biometricType 
  }).select('organizationId userId registrationMetadata');
  
  return existing;
};

// Static method to register new biometric
globalBiometricSchema.statics.registerBiometric = async function(data) {
  const { commitmentHash, nullifier, biometricType, organizationId, userId, userModel, metadata } = data;
  
  // Check if already exists
  const existing = await this.checkBiometricExists(commitmentHash, biometricType);
  if (existing) {
    const error = new Error('Biometric already registered in the system');
    error.code = 'BIOMETRIC_DUPLICATE';
    error.existingRegistration = {
      organizationId: existing.organizationId,
      registeredAt: existing.registrationMetadata.timestamp
    };
    throw error;
  }
  
  // Check nullifier
  const nullifierExists = await this.findOne({ nullifier });
  if (nullifierExists) {
    const error = new Error('Biometric nullifier already exists');
    error.code = 'NULLIFIER_DUPLICATE';
    throw error;
  }
  
  // Create new registration
  const registration = new this({
    commitmentHash,
    nullifier,
    biometricType,
    organizationId,
    userId,
    userModel,
    registrationMetadata: metadata,
    auditLog: [{
      action: 'REGISTERED',
      timestamp: new Date(),
      organizationId,
      details: { initialRegistration: true }
    }]
  });
  
  await registration.save();
  return registration;
};

// Method to log attempted duplicate registrations
globalBiometricSchema.statics.logDuplicateAttempt = async function(commitmentHash, attemptData) {
  const existing = await this.findOne({ commitmentHash });
  if (existing) {
    existing.securityFlags.multipleAttempts += 1;
    existing.securityFlags.lastAttemptedRegistration = new Date();
    
    // Flag as suspicious after 3 attempts
    if (existing.securityFlags.multipleAttempts >= 3) {
      existing.securityFlags.suspiciousActivity = true;
    }
    
    // Add to audit log
    existing.auditLog.push({
      action: 'DUPLICATE_ATTEMPT',
      timestamp: new Date(),
      organizationId: attemptData.organizationId,
      details: attemptData
    });
    
    await existing.save();
  }
};

const GlobalBiometricRegistry = mongoose.model('GlobalBiometricRegistry', globalBiometricSchema);

// backend/src/services/biometricValidation.service.js
import GlobalBiometricRegistry from '../models/GlobalBiometricRegistry.js';
import logger from '../config/logger.js';

class BiometricValidationService {
  /**
   * Validate biometric uniqueness before registration
   */
  async validateBiometricUniqueness(biometricData) {
    const results = {
      isUnique: true,
      conflicts: [],
      warnings: []
    };
    
    try {
      // Check face biometric
      if (biometricData.faceCommitment) {
        const faceExists = await GlobalBiometricRegistry.checkBiometricExists(
          biometricData.faceCommitment.commitmentHash,
          'face'
        );
        
        if (faceExists) {
          results.isUnique = false;
          results.conflicts.push({
            type: 'face',
            message: 'This face is already registered in the system',
            registeredOrganization: faceExists.organizationId,
            registeredAt: faceExists.registrationMetadata.timestamp
          });
          
          // Log the attempt
          await GlobalBiometricRegistry.logDuplicateAttempt(
            biometricData.faceCommitment.commitmentHash,
            {
              organizationId: biometricData.organizationId,
              attemptedUserId: biometricData.userId,
              deviceId: biometricData.deviceId
            }
          );
        }
      }
      
      // Check fingerprint biometric
      if (biometricData.fingerprintCommitment) {
        const fingerprintExists = await GlobalBiometricRegistry.checkBiometricExists(
          biometricData.fingerprintCommitment.commitmentHash,
          'fingerprint'
        );
        
        if (fingerprintExists) {
          results.isUnique = false;
          results.conflicts.push({
            type: 'fingerprint',
            message: 'This fingerprint is already registered in the system',
            registeredOrganization: fingerprintExists.organizationId,
            registeredAt: fingerprintExists.registrationMetadata.timestamp
          });
          
          // Log the attempt
          await GlobalBiometricRegistry.logDuplicateAttempt(
            biometricData.fingerprintCommitment.commitmentHash,
            {
              organizationId: biometricData.organizationId,
              attemptedUserId: biometricData.userId,
              deviceId: biometricData.deviceId
            }
          );
        }
      }
      
      // Check for suspicious patterns
      if (biometricData.deviceId) {
        const recentAttempts = await this.checkRecentAttemptsFromDevice(
          biometricData.deviceId
        );
        
        if (recentAttempts > 5) {
          results.warnings.push({
            type: 'suspicious_activity',
            message: 'Multiple registration attempts from this device'
          });
        }
      }
      
    } catch (error) {
      logger.error('Error validating biometric uniqueness:', error);
      throw error;
    }
    
    return results;
  }
  
  /**
   * Register biometric after validation
   */
  async registerBiometric(biometricData) {
    const registrations = [];
    
    try {
      // Register face
      if (biometricData.faceCommitment) {
        const faceReg = await GlobalBiometricRegistry.registerBiometric({
          commitmentHash: biometricData.faceCommitment.commitmentHash,
          nullifier: biometricData.faceCommitment.nullifier,
          biometricType: 'face',
          organizationId: biometricData.organizationId,
          userId: biometricData.userId,
          userModel: biometricData.userModel || 'Scholar',
          metadata: {
            deviceId: biometricData.deviceId,
            appVersion: biometricData.appVersion,
            platform: biometricData.platform,
            ipAddress: biometricData.ipAddress,
            location: biometricData.location
          }
        });
        registrations.push(faceReg);
      }
      
      // Register fingerprint
      if (biometricData.fingerprintCommitment) {
        const fingerprintReg = await GlobalBiometricRegistry.registerBiometric({
          commitmentHash: biometricData.fingerprintCommitment.commitmentHash,
          nullifier: biometricData.fingerprintCommitment.nullifier,
          biometricType: 'fingerprint',
          organizationId: biometricData.organizationId,
          userId: biometricData.userId,
          userModel: biometricData.userModel || 'Scholar',
          metadata: {
            deviceId: biometricData.deviceId,
            appVersion: biometricData.appVersion,
            platform: biometricData.platform,
            ipAddress: biometricData.ipAddress,
            location: biometricData.location
          }
        });
        registrations.push(fingerprintReg);
      }
      
      logger.info(`Biometric registered globally for user ${biometricData.userId}`);
      return registrations;
      
    } catch (error) {
      // Rollback any successful registrations if one fails
      for (const reg of registrations) {
        await GlobalBiometricRegistry.findByIdAndDelete(reg._id);
      }
      throw error;
    }
  }
  
  /**
   * Check recent registration attempts from a device
   */
  async checkRecentAttemptsFromDevice(deviceId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const attempts = await GlobalBiometricRegistry.countDocuments({
      'registrationMetadata.deviceId': deviceId,
      'registrationMetadata.timestamp': { $gte: oneHourAgo }
    });
    
    return attempts;
  }
  
  /**
   * Verify biometric ownership during attendance
   */
  async verifyBiometricOwnership(userId, commitmentHash, biometricType) {
    const registration = await GlobalBiometricRegistry.findOne({
      commitmentHash,
      biometricType,
      userId
    });
    
    if (!registration) {
      throw new Error('Biometric not registered for this user');
    }
    
    // Add verification to audit log
    registration.auditLog.push({
      action: 'VERIFIED',
      timestamp: new Date(),
      details: { verificationType: 'attendance' }
    });
    
    await registration.save();
    return true;
  }
}

export default new BiometricValidationService();