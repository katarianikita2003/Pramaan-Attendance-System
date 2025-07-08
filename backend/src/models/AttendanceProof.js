// backend/src/models/AttendanceProof.js
import mongoose from 'mongoose';

const attendanceProofSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  scholarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    required: true,
    index: true
  },
  proofData: {
    zkProof: {
      type: String,
      required: true
    },
    publicInputs: {
      did: String,
      timestamp: Number,
      location: {
        latitude: Number,
        longitude: Number
      }
    },
    verificationKey: String,
    proofHash: {
      type: String,
      unique: true,
      required: true
    }
  },
  metadata: {
    date: {
      type: Date,
      required: true,
      index: true
    },
    checkInTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'late', 'absent'],
      default: 'present'
    },
    location: {
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      accuracy: Number,
      address: String,
      campus: String
    },
    device: {
      deviceId: String,
      platform: String,
      appVersion: String
    }
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: true
    },
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['automatic', 'manual', 'blockchain'],
      default: 'automatic'
    },
    blockchainTx: String
  },
  certificate: {
    generated: {
      type: Boolean,
      default: false
    },
    url: String,
    qrCode: String,
    generatedAt: Date
  },
  flags: {
    suspicious: {
      type: Boolean,
      default: false
    },
    reason: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    reviewedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 365 * 24 * 60 * 60 // Auto-delete after 1 year
  }
});

// Compound indexes
attendanceProofSchema.index({ scholarId: 1, 'metadata.date': -1 });
attendanceProofSchema.index({ organizationId: 1, 'metadata.date': -1 });
attendanceProofSchema.index({ 'metadata.date': 1, 'metadata.status': 1 });

// Ensure one attendance per scholar per day
attendanceProofSchema.index(
  { 
    scholarId: 1, 
    'metadata.date': 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: { 'verification.isVerified': true }
  }
);

// Methods
attendanceProofSchema.methods.generateCertificate = async function() {
  // This will be implemented by the certificate service
  this.certificate.generated = true;
  this.certificate.generatedAt = new Date();
  return this.save();
};

attendanceProofSchema.methods.flagSuspicious = async function(reason, adminId) {
  this.flags.suspicious = true;
  this.flags.reason = reason;
  this.flags.reviewedBy = adminId;
  this.flags.reviewedAt = new Date();
  return this.save();
};

// Virtual for display time
attendanceProofSchema.virtual('displayTime').get(function() {
  const time = new Date(this.metadata.checkInTime);
  return time.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
});

export default mongoose.model('AttendanceProof', attendanceProofSchema);