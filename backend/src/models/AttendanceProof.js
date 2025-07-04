// ===== backend/src/models/AttendanceProof.js =====
import mongoose from 'mongoose';

const AttendanceProofSchema = new mongoose.Schema({
  scholarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  checkIn: {
    timestamp: {
      type: Date,
      required: true
    },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      address: String
    },
    zkProof: {
      protocol: { type: String, default: 'groth16' },
      curve: { type: String, default: 'bn128' },
      proof: {
        pi_a: [String],
        pi_b: [[String]],
        pi_c: [String]
      },
      publicSignals: [String],
      proofHash: {
        type: String,
        unique: true,
        required: true
      },
      generationTime: Number // milliseconds
    },
    deviceInfo: {
      model: String,
      os: String,
      appVersion: String,
      ipAddress: String
    },
    biometricTypes: [{
      type: String,
      enum: ['fingerprint', 'face']
    }],
    verificationStatus: {
      type: String,
      enum: ['verified', 'pending', 'failed'],
      default: 'verified'
    },
    verificationDetails: {
      timestamp: Date,
      method: String,
      score: Number
    }
  },
  checkOut: {
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      address: String
    },
    zkProof: {
      protocol: { type: String, default: 'groth16' },
      curve: { type: String, default: 'bn128' },
      proof: {
        pi_a: [String],
        pi_b: [[String]],
        pi_c: [String]
      },
      publicSignals: [String],
      proofHash: String,
      generationTime: Number
    }
  },
  duration: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
    default: 'present'
  },
  flags: {
    isLate: { type: Boolean, default: false },
    isEarlyCheckout: { type: Boolean, default: false },
    isOvertime: { type: Boolean, default: false },
    isManualEntry: { type: Boolean, default: false },
    isLocationMismatch: { type: Boolean, default: false }
  },
  certificates: [{
    url: String,
    generatedAt: Date,
    type: { type: String, enum: ['check-in', 'check-out', 'daily'] },
    downloadCount: { type: Number, default: 0 }
  }],
  notes: {
    scholar: String,
    admin: String
  },
  audit: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    modifiedBy: String,
    modifications: [{
      timestamp: Date,
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      modifiedBy: String,
      reason: String
    }]
  }
});

// Indexes
AttendanceProofSchema.index({ organizationId: 1, date: -1 });
AttendanceProofSchema.index({ scholarId: 1, date: -1 });
AttendanceProofSchema.index({ 'checkIn.zkProof.proofHash': 1 });
AttendanceProofSchema.index({ date: 1, status: 1 });

// Virtual fields
AttendanceProofSchema.virtual('isComplete').get(function() {
  return !!(this.checkIn && this.checkOut);
});

AttendanceProofSchema.virtual('workDuration').get(function() {
  if (!this.checkIn || !this.checkOut) return null;
  return {
    hours: this.duration.hours,
    minutes: this.duration.minutes,
    formatted: `${this.duration.hours}h ${this.duration.minutes}m`
  };
});

// Methods
AttendanceProofSchema.methods.calculateDuration = function() {
  if (!this.checkIn || !this.checkOut) return;
  
  const diff = this.checkOut.timestamp - this.checkIn.timestamp;
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  this.duration = {
    hours,
    minutes,
    totalMinutes
  };
};

AttendanceProofSchema.methods.checkFlags = function(organizationSettings) {
  const checkInTime = new Date(this.checkIn.timestamp);
  const workStartTime = new Date(checkInTime);
  const [startHour, startMinute] = organizationSettings.workingHours.start.split(':');
  workStartTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
  
  // Check if late
  const lateThreshold = organizationSettings.attendanceRules.allowLateCheckIn * 60000;
  if (checkInTime > new Date(workStartTime.getTime() + lateThreshold)) {
    this.flags.isLate = true;
    this.status = 'late';
  }
  
  // Check overtime
  if (this.duration.totalMinutes > organizationSettings.attendanceRules.overtimeThreshold * 60) {
    this.flags.isOvertime = true;
  }
};

AttendanceProofSchema.methods.generateCertificateUrl = function(type) {
  const certificateId = `${this.scholarId}_${this.date.toISOString().split('T')[0]}_${type}`;
  return `/api/attendance/certificate/${certificateId}`;
};

// Statics
AttendanceProofSchema.statics.getDailyReport = async function(organizationId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return await this.aggregate([
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        date: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Pre-save middleware
AttendanceProofSchema.pre('save', function(next) {
  this.audit.updatedAt = new Date();
  if (this.checkIn && this.checkOut) {
    this.calculateDuration();
  }
  next();
});

export default mongoose.model('AttendanceProof', AttendanceProofSchema);