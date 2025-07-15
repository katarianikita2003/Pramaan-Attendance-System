// backend/src/models/Scholar.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const scholarSchema = new mongoose.Schema({
  scholarId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
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
      trim: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    }
  },
  academicInfo: {
    department: {
      type: String,
      required: true
    },
    course: {
      type: String,
      required: true
    },
    year: {
      type: String,
      required: true
    },
    section: String,
    rollNumber: String,
    admissionYear: Number,
    expectedGraduation: Number
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  credentials: {
    passwordHash: {
      type: String,
      required: true
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date
  },
  biometrics: {
    isEnrolled: { type: Boolean, default: false },
    enrolledAt: { type: Date },
    faceEnrolled: { type: Boolean, default: false },
    fingerprintEnrolled: { type: Boolean, default: false },
    // Store just the commitment strings, not objects
    faceCommitment: { type: String },
    fingerprintCommitment: { type: String },
    registeredAt: { type: Date }
  },
  guardianInfo: {
    name: String,
    relation: String,
    phone: String,
    email: String
  },
  attendanceStats: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    lastUpdated: Date
  },
  activity: {
    lastLogin: Date,
    lastAttendance: Date,
    totalLogins: { type: Number, default: 0 }
  },
  devices: [{
    deviceId: String,
    platform: String,
    model: String,
    lastActive: Date
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'graduated', 'pending_approval'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  biometricEnrollment: {
    fingerprint: {
      commitment: {
        type: String,
        select: false // Don't return commitment by default for security
      },
      enrolledAt: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    },
    face: {
      commitment: {
        type: String,
        select: false // Don't return commitment by default for security
      },
      enrolledAt: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    }
  },
  isBiometricEnrolled: {
    type: Boolean,
    default: false
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showAttendance: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Indexes
scholarSchema.index({ scholarId: 1, organizationId: 1 });
scholarSchema.index({ 'personalInfo.email': 1 });
scholarSchema.index({ organizationId: 1, status: 1 });

// Virtual for full name
scholarSchema.virtual('fullName').get(function () {
  return this.personalInfo.name;
});

// Method to compare password
scholarSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.credentials.passwordHash);
};

// Method to check biometric enrollment status
scholarSchema.methods.checkBiometricEnrollment = function() {
  return {
    isEnrolled: this.isBiometricEnrolled,
    hasFingerprint: this.biometricEnrollment?.fingerprint?.isActive || false,
    hasFace: this.biometricEnrollment?.face?.isActive || false
  };
};

// Method to set password
scholarSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.credentials.passwordHash = await bcrypt.hash(plainPassword, salt);
  this.credentials.passwordChangedAt = new Date();
};

// Method to update attendance stats
scholarSchema.methods.updateAttendanceStats = async function () {
  const Attendance = mongoose.model('Attendance');
  const attendanceCount = await Attendance.countDocuments({
    scholarId: this._id,
    status: 'present'
  });

  this.attendanceStats.presentDays = attendanceCount;
  this.attendanceStats.totalDays = 100; // This should be calculated based on academic calendar
  this.attendanceStats.absentDays = this.attendanceStats.totalDays - attendanceCount;
  this.attendanceStats.percentage = Math.round((attendanceCount / this.attendanceStats.totalDays) * 100);
  this.attendanceStats.lastUpdated = new Date();

  return this.save();
};

// Method to add device
scholarSchema.methods.addDevice = function (deviceInfo) {
  // Remove existing device with same ID
  this.devices = this.devices.filter(d => d.deviceId !== deviceInfo.deviceId);

  // Add new device
  this.devices.push({
    ...deviceInfo,
    lastActive: new Date()
  });

  // Keep only last 5 devices
  if (this.devices.length > 5) {
    this.devices = this.devices.slice(-5);
  }

  return this.save();
};

const Scholar = mongoose.model('Scholar', scholarSchema);

export default Scholar;