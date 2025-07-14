// backend/src/models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
    default: Date.now,
    required: true
  },
  attendanceType: {
    type: String,
    enum: ['checkIn', 'checkOut'],
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'halfDay'],
    default: 'present'
  },
  proofData: {
    zkProof: {
      proofId: {
        type: String,
        required: true,
        unique: true,
        index: true
      },
      proof: {
        type: String,
        required: true  // THIS IS THE REQUIRED FIELD THAT WAS MISSING
      },
      publicInputs: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      verificationKey: String,
      protocol: {
        type: String,
        default: 'groth16'
      }
    },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      timestamp: Date
    },
    verificationMethod: {
      type: String,
      enum: ['biometric_zkp', 'manual', 'qr_code'],
      default: 'biometric_zkp'
    }
  },
  deviceInfo: {
    deviceId: String,
    platform: String,
    appVersion: String
  },
  metadata: {
    checkInTime: Date,
    checkOutTime: Date,
    isLate: Boolean,
    biometricVerified: Boolean,
    locationVerified: Boolean,
    remarks: String
  }
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ scholarId: 1, date: -1 });
attendanceSchema.index({ organizationId: 1, date: -1 });
attendanceSchema.index({ 'proofData.zkProof.proofId': 1 });

// Methods
attendanceSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;