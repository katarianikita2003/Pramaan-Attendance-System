// backend/src/models/Attendance.enhanced.js
import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
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
  proofId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['checkIn', 'checkOut'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'expired', 'rejected'],
    default: 'pending_verification',
    index: true
  },
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    accuracy: Number,
    timestamp: Date,
    address: String
  },
  proof: {
    data: {
      pi_a: [String],
      pi_b: [[String]],
      pi_c: [String],
      protocol: String,
      curve: String
    },
    publicSignals: {
      commitmentHash: String,
      timestamp: Number,
      nullifier: String
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: Date,
  deviceInfo: {
    deviceId: String,
    model: String,
    platform: String,
    osVersion: String,
    appVersion: String
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String
  }
}, {
  timestamps: true
});

// Indexes for performance
AttendanceSchema.index({ scholarId: 1, createdAt: -1 });
AttendanceSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
AttendanceSchema.index({ 'proof.expiresAt': 1 }, { expireAfterSeconds: 0 });

// Methods
AttendanceSchema.methods.isExpired = function() {
  return new Date() > this.proof.expiresAt;
};

AttendanceSchema.methods.canBeVerified = function() {
  return this.status === 'pending_verification' && !this.isExpired();
};

// Statics
AttendanceSchema.statics.findPendingByOrganization = function(organizationId) {
  return this.find({
    organizationId,
    status: 'pending_verification',
    'proof.expiresAt': { $gt: new Date() }
  }).populate('scholarId');
};

AttendanceSchema.statics.getStatsByScholar = async function(scholarId, dateRange) {
  const query = { scholarId, status: 'verified' };
  
  if (dateRange) {
    query.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        checkIns: {
          $sum: { $cond: [{ $eq: ['$type', 'checkIn'] }, 1, 0] }
        },
        checkOuts: {
          $sum: { $cond: [{ $eq: ['$type', 'checkOut'] }, 1, 0] }
        },
        avgCheckInTime: {
          $avg: {
            $hour: '$createdAt'
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalDays: 0,
    checkIns: 0,
    checkOuts: 0,
    avgCheckInTime: null
  };
};

// Virtual for display
AttendanceSchema.virtual('displayStatus').get(function() {
  if (this.status === 'pending_verification' && this.isExpired()) {
    return 'expired';
  }
  return this.status;
});

const Attendance = mongoose.model('Attendance', AttendanceSchema);

export default Attendance;