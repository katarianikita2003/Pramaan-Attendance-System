// backend/src/models/BiometricCommitment.js
import mongoose from 'mongoose';

const biometricCommitmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  userType: {
    type: String,
    enum: ['scholar', 'admin'],
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  commitments: {
    face: {
      commitment: { type: String, required: false },
      hash: { type: String, required: false },
      timestamp: { type: Date, default: Date.now }
    },
    fingerprint: {
      commitment: { type: String, required: false },
      hash: { type: String, required: false },
      timestamp: { type: Date, default: Date.now }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for global uniqueness check
biometricCommitmentSchema.index({ 'commitments.face.hash': 1 }, { sparse: true });
biometricCommitmentSchema.index({ 'commitments.fingerprint.hash': 1 }, { sparse: true });

// Static method to check if biometric already exists globally
biometricCommitmentSchema.statics.findByHash = async function(hash, type = 'face') {
  const query = type === 'face' 
    ? { 'commitments.face.hash': hash }
    : { 'commitments.fingerprint.hash': hash };
  
  return await this.findOne(query);
};

// Static method to find by userId
biometricCommitmentSchema.statics.findByUserId = async function(userId) {
  return await this.findOne({ userId, isActive: true });
};

const BiometricCommitment = mongoose.model('BiometricCommitment', biometricCommitmentSchema);

export default BiometricCommitment;