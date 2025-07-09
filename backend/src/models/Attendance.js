// backend/src/models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
    default: Date.now
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    timestamp: {
      type: Date,
      required: true
    },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    }
  },
  checkOut: {
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    }
  },
  duration: {
    type: Number,
    default: 0
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    accuracy: Number,
    address: String
  },
  zkpProof: {
    proof: {
      type: String,
      required: true
    },
    publicSignals: [{
      type: String
    }],
    commitment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  verified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
    default: 'present'
  },
  flags: {
    locationMismatch: {
      type: Boolean,
      default: false
    },
    timeMismatch: {
      type: Boolean,
      default: false
    },
    suspicious: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    deviceId: String,
    deviceModel: String,
    appVersion: String,
    osVersion: String,
    ipAddress: String
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
attendanceSchema.index({ scholarId: 1, date: -1 });
attendanceSchema.index({ organizationId: 1, date: -1 });
attendanceSchema.index({ timestamp: -1 });
attendanceSchema.index({ verificationStatus: 1 });

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Method to calculate duration
attendanceSchema.methods.calculateDuration = function() {
  if (this.checkIn && this.checkOut) {
    const duration = Math.floor((this.checkOut.timestamp - this.checkIn.timestamp) / (1000 * 60));
    this.duration = duration;
    return duration;
  }
  return 0;
};

// Static method to get today's attendance for a scholar
attendanceSchema.statics.getTodayAttendance = async function(scholarId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.findOne({
    scholarId,
    timestamp: { $gte: today, $lt: tomorrow }
  });
};

// Static method to get attendance statistics
attendanceSchema.statics.getStatistics = async function(organizationId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        organizationId: mongoose.Types.ObjectId(organizationId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];

  return this.aggregate(pipeline);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;