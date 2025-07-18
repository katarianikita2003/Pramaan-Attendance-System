// backend/src/models/BiometricCommitment.js
import mongoose from 'mongoose';

const biometricDataSchema = new mongoose.Schema({
  commitment: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true,
    index: true
  },
  salt: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const biometricCommitmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'userType'
  },
  userType: {
    type: String,
    required: true,
    enum: ['Scholar', 'Faculty', 'Staff']
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  commitments: {
    face: {
      type: biometricDataSchema,
      required: false
    },
    fingerprint: {
      type: biometricDataSchema,
      required: false
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  deactivatedAt: Date,
  deactivationReason: String,
  verificationAttempts: {
    type: Number,
    default: 0
  },
  lastVerificationAttempt: Date,
  lastSuccessfulVerification: Date,
  metadata: {
    deviceId: String,
    appVersion: String,
    platform: String,
    enrollmentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
biometricCommitmentSchema.index({ userId: 1, isActive: 1 });
biometricCommitmentSchema.index({ organizationId: 1, isActive: 1 });
biometricCommitmentSchema.index({ 'commitments.face.hash': 1, isActive: 1 });
biometricCommitmentSchema.index({ 'commitments.fingerprint.hash': 1, isActive: 1 });

// Static methods
biometricCommitmentSchema.statics.findByUserId = async function(userId) {
  return this.findOne({ userId, isActive: true });
};

biometricCommitmentSchema.statics.findByHash = async function(hash, type) {
  const query = { isActive: true };
  if (type === 'face') {
    query['commitments.face.hash'] = hash;
  } else if (type === 'fingerprint') {
    query['commitments.fingerprint.hash'] = hash;
  }
  return this.findOne(query);
};

biometricCommitmentSchema.statics.checkGlobalUniqueness = async function(hash, type, excludeUserId) {
  const query = { isActive: true };
  if (type === 'face') {
    query['commitments.face.hash'] = hash;
  } else if (type === 'fingerprint') {
    query['commitments.fingerprint.hash'] = hash;
  }
  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }
  const existing = await this.findOne(query);
  return !existing;
};

// Instance methods
biometricCommitmentSchema.methods.deactivate = async function(reason) {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.deactivationReason = reason;
  return this.save();
};

biometricCommitmentSchema.methods.verifyBiometric = async function(providedCommitment, proof) {
  // In production, this would verify the ZKP proof
  // For simulation, we'll just check if commitment exists
  if (this.commitments.face && this.commitments.face.hash === providedCommitment) {
    return true;
  }
  if (this.commitments.fingerprint && this.commitments.fingerprint.hash === providedCommitment) {
    return true;
  }
  return false;
};

// Pre-save middleware to ensure at least one biometric is enrolled
biometricCommitmentSchema.pre('save', function(next) {
  const hasFace = this.commitments?.face?.hash;
  const hasFingerprint = this.commitments?.fingerprint?.hash;
  
  if (!hasFace && !hasFingerprint) {
    next(new Error('At least one biometric type must be enrolled'));
  } else {
    next();
  }
});

const BiometricCommitment = mongoose.model('BiometricCommitment', biometricCommitmentSchema);

export default BiometricCommitment;