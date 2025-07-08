// backend/src/models/BiometricCommitment.js
import mongoose from 'mongoose';

const biometricCommitmentSchema = new mongoose.Schema({
  scholarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    required: true,
    unique: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  commitments: {
    face: {
      commitment: {
        type: String,
        required: true,
        select: false
      },
      hash: {
        type: String,
        required: true,
        index: true
      },
      version: {
        type: Number,
        default: 1
      }
    },
    fingerprint: {
      commitment: {
        type: String,
        required: true,
        select: false
      },
      hash: {
        type: String,
        required: true,
        index: true
      },
      version: {
        type: Number,
        default: 1
      }
    },
    combined: {
      commitment: {
        type: String,
        required: true,
        select: false
      },
      hash: {
        type: String,
        required: true,
        unique: true
      }
    }
  },
  zkpParams: {
    publicKey: {
      type: String,
      required: true
    },
    nullifier: {
      type: String,
      required: true,
      unique: true
    },
    merkleRoot: String,
    merkleIndex: Number
  },
  encryptedData: {
    salts: {
      type: String,
      select: false
    },
    nonce: {
      type: String,
      select: false
    }
  },
  metadata: {
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updateCount: {
      type: Number,
      default: 0
    },
    device: {
      type: String
    },
    quality: {
      face: Number,
      fingerprint: Number
    }
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verificationMethod: String,
    verifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked', 'expired'],
    default: 'active'
  },
  revocation: {
    isRevoked: {
      type: Boolean,
      default: false
    },
    revokedAt: Date,
    reason: String,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
biometricCommitmentSchema.index({ scholarId: 1, status: 1 });
biometricCommitmentSchema.index({ organizationId: 1, status: 1 });
biometricCommitmentSchema.index({ 'commitments.combined.hash': 1 });
biometricCommitmentSchema.index({ 'zkpParams.nullifier': 1 });

// Methods
biometricCommitmentSchema.methods.updateCommitment = async function(type, newCommitment, newHash) {
  if (!['face', 'fingerprint'].includes(type)) {
    throw new Error('Invalid biometric type');
  }
  
  this.commitments[type].commitment = newCommitment;
  this.commitments[type].hash = newHash;
  this.commitments[type].version += 1;
  
  this.metadata.lastUpdated = new Date();
  this.metadata.updateCount += 1;
  
  return this.save();
};

biometricCommitmentSchema.methods.revoke = async function(reason, adminId) {
  this.status = 'revoked';
  this.revocation.isRevoked = true;
  this.revocation.revokedAt = new Date();
  this.revocation.reason = reason;
  this.revocation.revokedBy = adminId;
  
  return this.save();
};

biometricCommitmentSchema.methods.verify = async function(adminId) {
  this.verification.isVerified = true;
  this.verification.verifiedAt = new Date();
  this.verification.verifier = adminId;
  
  return this.save();
};

// Static methods
biometricCommitmentSchema.statics.findByHash = function(hash) {
  return this.findOne({
    $or: [
      { 'commitments.face.hash': hash },
      { 'commitments.fingerprint.hash': hash },
      { 'commitments.combined.hash': hash }
    ],
    status: 'active'
  });
};

biometricCommitmentSchema.statics.checkGlobalUniqueness = async function(combinedHash) {
  const existing = await this.findOne({
    'commitments.combined.hash': combinedHash,
    status: 'active'
  });
  
  return !existing;
};

// Pre-save middleware
biometricCommitmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const BiometricCommitment = mongoose.model('BiometricCommitment', biometricCommitmentSchema);

export default BiometricCommitment;