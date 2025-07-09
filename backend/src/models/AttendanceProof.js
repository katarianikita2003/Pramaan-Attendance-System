// backend/src/models/AttendanceProof.js
import mongoose from 'mongoose';

const attendanceProofSchema = new mongoose.Schema({
  scholarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  proof: {
    type: String,
    required: true,
    unique: true
  },
  publicSignals: [{
    type: String
  }],
  commitment: {
    type: String,
    required: true
  },
  verificationResult: {
    valid: {
      type: Boolean,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    verifier: String
  },
  qrCode: {
    data: String,
    generatedAt: Date
  },
  metadata: {
    deviceId: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    ipAddress: String
  }
}, {
  timestamps: true
});

const AttendanceProof = mongoose.model('AttendanceProof', attendanceProofSchema);

export default AttendanceProof;