// ===== backend/src/models/Scholar.js =====
import mongoose from 'mongoose';
import crypto from 'crypto';

const ScholarSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  scholarId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  personalInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    photo: String
  },
  academicInfo: {
    department: String,
    course: String,
    year: Number,
    semester: Number,
    supervisor: String,
    enrollmentDate: Date,
    expectedGraduation: Date
  },
  biometricData: {
    enrollmentStatus: {
      fingerprint: { type: Boolean, default: false },
      face: { type: Boolean, default: false }
    },
    commitments: {
      fingerprint: String,
      face: String,
      combined: String
    },
    salts: {
      type: String, // Encrypted
      select: false
    },
    globalHash: {
      type: String,
      unique: true,
      sparse: true,
      select: false
    },
    lastUpdated: Date,
    deviceInfo: {
      model: String,
      os: String,
      appVersion: String
    }
  },
  zkpData: {
    publicKey: {
      type: String,
      required: true
    },
    keyGenerationDate: {
      type: Date,
      default: Date.now
    },
    proofCount: {
      type: Number,
      default: 0
    }
  },
  attendanceStats: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    averageCheckInTime: String,
    averageWorkDuration: Number, // hours
    lastAttendance: Date,
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true }
    }
  },
  status: {
    isActive: { type: Boolean, default: true },
    isGraduated: { type: Boolean, default: false },
    suspendedUntil: Date,
    suspensionReason: String
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    lastModifiedBy: String,
    loginAttempts: { type: Number, default: 0 },
    lastLoginAttempt: Date,
    deviceTokens: [String]
  }
});

// Compound indexes
ScholarSchema.index({ organizationId: 1, scholarId: 1 }, { unique: true });
ScholarSchema.index({ organizationId: 1, 'personalInfo.email': 1 }, { unique: true });
ScholarSchema.index({ organizationId: 1, 'status.isActive': 1 });
ScholarSchema.index({ 'attendanceStats.lastAttendance': -1 });

// Virtual fields
ScholarSchema.virtual('attendancePercentage').get(function() {
  if (this.attendanceStats.totalDays === 0) return 0;
  return (this.attendanceStats.presentDays / this.attendanceStats.totalDays * 100).toFixed(2);
});

ScholarSchema.virtual('fullName').get(function() {
  return this.personalInfo.name;
});

// Methods
ScholarSchema.methods.generateZKPKeys = function() {
  this.zkpData.publicKey = crypto.randomBytes(32).toString('hex');
  this.zkpData.keyGenerationDate = new Date();
};

ScholarSchema.methods.updateAttendanceStats = function(type) {
  this.attendanceStats.totalDays++;
  
  if (type === 'present') {
    this.attendanceStats.presentDays++;
    this.attendanceStats.currentStreak++;
    if (this.attendanceStats.currentStreak > this.attendanceStats.longestStreak) {
      this.attendanceStats.longestStreak = this.attendanceStats.currentStreak;
    }
  } else if (type === 'absent') {
    this.attendanceStats.absentDays++;
    this.attendanceStats.currentStreak = 0;
  } else if (type === 'late') {
    this.attendanceStats.presentDays++;
    this.attendanceStats.lateDays++;
  }
  
  this.attendanceStats.lastAttendance = new Date();
};

ScholarSchema.methods.isEligibleForAttendance = function() {
  return this.status.isActive && 
         !this.status.isGraduated && 
         (!this.status.suspendedUntil || this.status.suspendedUntil < new Date());
};

// Statics
ScholarSchema.statics.checkBiometricUniqueness = async function(globalHash) {
  const existing = await this.findOne({ 'biometricData.globalHash': globalHash });
  return !existing;
};

ScholarSchema.statics.getActiveScholarsCount = async function(organizationId) {
  return await this.countDocuments({ 
    organizationId, 
    'status.isActive': true,
    'status.isGraduated': false
  });
};

// Pre-save middleware
ScholarSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export default mongoose.model('Scholar', ScholarSchema);
