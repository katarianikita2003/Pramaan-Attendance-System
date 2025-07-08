// backend/src/models/Scholar.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    unique: true
  },
  personalInfo: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true
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
      pincode: String
    },
    profilePicture: String
  },
  credentials: {
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    pin: {
      type: String,
      select: false
    }
  },
  biometricData: {
    faceEncodings: [{
      encoding: {
        type: String,
        select: false
      },
      capturedAt: {
        type: Date,
        default: Date.now
      }
    }],
    fingerprintHashes: [{
      hash: {
        type: String,
        select: false
      },
      finger: {
        type: String,
        enum: ['thumb', 'index', 'middle', 'ring', 'little']
      },
      hand: {
        type: String,
        enum: ['left', 'right']
      },
      capturedAt: {
        type: Date,
        default: Date.now
      }
    }],
    biometricCommitment: {
      type: String,
      select: false
    }
  },
  academicInfo: {
    course: String,
    department: String,
    year: Number,
    section: String,
    rollNumber: String,
    admissionYear: Number,
    expectedGraduation: Number
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
    percentage: {
      type: Number,
      default: 0
    },
    lastMarked: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'graduated'],
    default: 'active'
  },
  verification: {
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    isBiometricRegistered: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date
  },
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showProfile: {
        type: Boolean,
        default: true
      },
      showAttendance: {
        type: Boolean,
        default: false
      }
    }
  },
  devices: [{
    deviceId: String,
    deviceType: String,
    deviceToken: String,
    lastActive: Date
  }],
  joinedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
scholarSchema.index({ 'personalInfo.email': 1 });
scholarSchema.index({ organizationId: 1, status: 1 });
scholarSchema.index({ organizationId: 1, scholarId: 1 });

// Virtual for attendance percentage
scholarSchema.virtual('attendancePercentage').get(function() {
  if (this.attendance.totalDays === 0) return 0;
  return Math.round((this.attendance.presentDays / this.attendance.totalDays) * 100);
});

// Methods
scholarSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.credentials.password);
};

scholarSchema.methods.comparePin = async function(candidatePin) {
  if (!this.credentials.pin) return false;
  return await bcrypt.compare(candidatePin, this.credentials.pin);
};

scholarSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    {
      id: this._id,
      organizationId: this.organizationId,
      role: 'scholar',
      email: this.personalInfo.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
  return token;
};

scholarSchema.methods.generateVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verification.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.verification.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

scholarSchema.methods.markAttendance = async function() {
  this.attendance.presentDays += 1;
  this.attendance.lastMarked = new Date();
  await this.updateAttendancePercentage();
  return this.save();
};

scholarSchema.methods.updateAttendancePercentage = async function() {
  if (this.attendance.totalDays > 0) {
    this.attendance.percentage = Math.round(
      (this.attendance.presentDays / this.attendance.totalDays) * 100
    );
  }
};

scholarSchema.methods.canMarkAttendance = function() {
  if (!this.attendance.lastMarked) return true;
  
  const lastMarked = new Date(this.attendance.lastMarked);
  const today = new Date();
  
  // Reset to start of day for comparison
  lastMarked.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return lastMarked < today;
};

// Pre-save middleware
scholarSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('credentials.password')) {
    const salt = await bcrypt.genSalt(10);
    this.credentials.password = await bcrypt.hash(this.credentials.password, salt);
  }
  
  // Hash PIN if modified
  if (this.isModified('credentials.pin') && this.credentials.pin) {
    const salt = await bcrypt.genSalt(10);
    this.credentials.pin = await bcrypt.hash(this.credentials.pin, salt);
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

// Generate unique scholar ID
scholarSchema.pre('save', async function(next) {
  if (!this.scholarId) {
    const org = await mongoose.model('Organization').findById(this.organizationId);
    const count = await mongoose.model('Scholar').countDocuments({ 
      organizationId: this.organizationId 
    });
    
    this.scholarId = `${org.code}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Scholar = mongoose.model('Scholar', scholarSchema);

export default Scholar;