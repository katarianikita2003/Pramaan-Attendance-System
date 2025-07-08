// backend/src/models/Scholar.js
import mongoose from 'mongoose';

const scholarSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  scholarId: {
    type: String,
    required: true,
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
      lowercase: true
    },
    phone: String,
    dateOfBirth: Date,
    profileImage: String
  },
  academicInfo: {
    department: String,
    course: String,
    batch: String,
    semester: Number,
    rollNumber: String
  },
  biometricData: {
    faceCommitment: {
      type: String,
      unique: true,
      sparse: true
    },
    fingerprintCommitment: {
      type: String,
      unique: true,
      sparse: true
    },
    globalHash: {
      type: String,
      unique: true,
      required: true
    },
    did: {
      type: String,
      unique: true,
      required: true
    },
    salts: {
      face: String,
      fingerprint: String
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  attendance: {
    totalDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    lateDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    lastCheckedIn: Date
  },
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified'
    },
    suspendedUntil: Date,
    suspensionReason: String
  },
  devices: [{
    deviceId: String,
    deviceName: String,
    platform: String,
    lastUsed: Date,
    isActive: Boolean
  }],
  notifications: {
    fcmToken: String,
    preferences: {
      attendance: {
        type: Boolean,
        default: true
      },
      announcements: {
        type: Boolean,
        default: true
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index
scholarSchema.index({ organizationId: 1, scholarId: 1 }, { unique: true });
scholarSchema.index({ organizationId: 1, 'personalInfo.email': 1 }, { unique: true });

// Methods
scholarSchema.methods.canMarkAttendance = function() {
  if (!this.status.isActive) return false;
  if (this.status.suspendedUntil && this.status.suspendedUntil > Date.now()) return false;
  
  // Check if already marked today
  if (this.attendance.lastCheckedIn) {
    const lastCheckin = new Date(this.attendance.lastCheckedIn);
    const today = new Date();
    if (lastCheckin.toDateString() === today.toDateString()) {
      return false;
    }
  }
  
  return true;
};

scholarSchema.methods.updateAttendanceStats = function(status) {
  this.attendance.totalDays += 1;
  
  switch(status) {
    case 'present':
      this.attendance.presentDays += 1;
      break;
    case 'late':
      this.attendance.presentDays += 1;
      this.attendance.lateDays += 1;
      break;
    case 'absent':
      this.attendance.absentDays += 1;
      break;
  }
  
  this.attendance.percentage = (this.attendance.presentDays / this.attendance.totalDays) * 100;
  this.attendance.lastCheckedIn = new Date();
  
  return this.save();
};

export default mongoose.model('Scholar', scholarSchema);