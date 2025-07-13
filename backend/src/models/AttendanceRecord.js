// backend/src/models/AttendanceRecord.js
import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  scholar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  markedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  locationValid: {
    type: Boolean,
    default: false
  },
  biometricType: {
    type: String,
    enum: ['fingerprint', 'face', 'both', 'simulated'],
    required: true
  },
  zkpProof: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  proofId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  verificationMethod: {
    type: String,
    enum: ['zkp', 'biometric', 'manual', 'simulated'],
    default: 'zkp'
  },
  deviceInfo: {
    deviceId: String,
    platform: String,
    appVersion: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: Date,
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
attendanceRecordSchema.index({ scholar: 1, markedAt: -1 });
attendanceRecordSchema.index({ organization: 1, markedAt: -1 });
attendanceRecordSchema.index({ proofId: 1 }, { unique: true });
attendanceRecordSchema.index({ markedAt: -1 });
attendanceRecordSchema.index({ location: '2dsphere' }); // For geospatial queries

// Virtual for formatted date
attendanceRecordSchema.virtual('formattedDate').get(function() {
  return this.markedAt.toLocaleDateString();
});

// Virtual for formatted time
attendanceRecordSchema.virtual('formattedTime').get(function() {
  return this.markedAt.toLocaleTimeString();
});

// Instance method to check if attendance is late
attendanceRecordSchema.methods.isLate = function(cutoffTime) {
  const markedTime = this.markedAt.getHours() * 60 + this.markedAt.getMinutes();
  const cutoff = cutoffTime.hours * 60 + cutoffTime.minutes;
  return markedTime > cutoff;
};

// Instance method to check if within campus
attendanceRecordSchema.methods.isWithinCampus = function() {
  return this.locationValid === true;
};

// Static method to get attendance for a date range
attendanceRecordSchema.statics.getAttendanceByDateRange = async function(
  scholarId,
  startDate,
  endDate
) {
  return this.find({
    scholar: scholarId,
    markedAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ markedAt: -1 });
};

// Static method to check if attendance already marked today
attendanceRecordSchema.statics.checkTodayAttendance = async function(scholarId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.findOne({
    scholar: scholarId,
    markedAt: {
      $gte: today,
      $lt: tomorrow
    }
  });
};

// Static method to get attendance statistics
attendanceRecordSchema.statics.getAttendanceStats = async function(
  scholarId,
  startDate,
  endDate
) {
  const stats = await this.aggregate([
    {
      $match: {
        scholar: new mongoose.Types.ObjectId(scholarId),
        markedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Static method to get organization-wide attendance for a date
attendanceRecordSchema.statics.getOrganizationAttendance = async function(
  organizationId,
  date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    organization: organizationId,
    markedAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  })
    .populate('scholar', 'scholarId personalInfo.name')
    .sort({ markedAt: -1 });
};

// Pre-save middleware to generate proof ID if not provided
attendanceRecordSchema.pre('save', function(next) {
  if (!this.proofId) {
    this.proofId = 'PROOF-' + Date.now().toString(36).toUpperCase() + '-' + 
                   Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Method to export attendance data
attendanceRecordSchema.methods.toExportFormat = function() {
  return {
    scholarId: this.scholar.scholarId,
    scholarName: this.scholar.personalInfo?.name || 'N/A',
    date: this.formattedDate,
    time: this.formattedTime,
    status: this.status,
    location: this.locationValid ? 'Within Campus' : 'Outside Campus',
    verificationMethod: this.verificationMethod,
    proofId: this.proofId
  };
};

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

export default AttendanceRecord;