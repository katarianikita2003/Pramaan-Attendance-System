// ===== backend/src/models/Organization.js =====
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxLength: 10
  },
  type: {
    type: String,
    enum: ['university', 'school', 'college', 'office', 'other'],
    required: true
  },
  admin: {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  settings: {
    locationBounds: {
      center: {
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 }
      },
      radius: { type: Number, default: 500 }, // meters
      polygon: [{
        latitude: Number,
        longitude: Number
      }]
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      timezone: { type: String, default: 'UTC' },
      workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5] // Monday to Friday
      }
    },
    biometricRequirements: {
      requireFace: { type: Boolean, default: true },
      requireFingerprint: { type: Boolean, default: true },
      livenessDetection: { type: Boolean, default: true },
      minimumQualityScore: { type: Number, default: 0.8 }
    },
    attendanceRules: {
      allowEarlyCheckIn: { type: Number, default: 30 }, // minutes
      allowLateCheckIn: { type: Number, default: 15 }, // minutes
      minimumWorkDuration: { type: Number, default: 6 }, // hours
      overtimeThreshold: { type: Number, default: 9 }, // hours
    },
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      dailyReport: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true }
    }
  },
  subscription: {
    plan: { 
      type: String, 
      enum: ['basic', 'pro', 'enterprise'],
      default: 'basic' 
    },
    validUntil: { 
      type: Date, 
      default: () => new Date(+new Date() + 365*24*60*60*1000) 
    },
    maxScholars: { type: Number, default: 100 },
    features: [{
      type: String,
      enum: ['basic', 'analytics', 'api', 'custom-branding', 'priority-support']
    }],
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'yearly'
    }
  },
  branding: {
    logo: String,
    primaryColor: { type: String, default: '#6200ee' },
    secondaryColor: { type: String, default: '#03dac6' }
  },
  stats: {
    totalScholars: { type: Number, default: 0 },
    activeScholars: { type: Number, default: 0 },
    totalAttendanceRecords: { type: Number, default: 0 },
    lastActiveDate: Date
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastModifiedBy: String,
    apiKey: String,
    webhookUrl: String
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationExpires: Date
});

// Indexes
OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ 'admin.email': 1 });
OrganizationSchema.index({ isActive: 1, 'subscription.validUntil': 1 });

// Methods
OrganizationSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.admin.passwordHash);
};

OrganizationSchema.methods.isSubscriptionValid = function() {
  return this.subscription.validUntil > new Date();
};

OrganizationSchema.methods.canAddMoreScholars = function() {
  if (this.subscription.plan === 'enterprise') return true;
  return this.stats.totalScholars < this.subscription.maxScholars;
};

// Statics
OrganizationSchema.statics.generateUniqueCode = async function(name) {
  const baseCode = name.substring(0, 3).toUpperCase();
  let code;
  let exists = true;
  let counter = 0;
  
  while (exists) {
    code = baseCode + Math.random().toString(36).substring(2, 5).toUpperCase();
    exists = await this.exists({ code });
    counter++;
    if (counter > 10) {
      code = baseCode + Date.now().toString(36).substring(-4).toUpperCase();
      break;
    }
  }
  
  return code;
};

// Pre-save middleware
OrganizationSchema.pre('save', async function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export default mongoose.model('Organization', OrganizationSchema);
