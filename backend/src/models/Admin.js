// backend/src/models/Admin.js
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
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
      unique: true,
      lowercase: true,
      index: true
    },
    phone: String,
    profileImage: String
  },
  credentials: {
    password: {
      type: String,
      required: true
    },
    resetToken: String,
    resetTokenExpiry: Date,
    lastPasswordChange: {
      type: Date,
      default: Date.now
    }
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'moderator'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: ['all', 'read', 'write', 'delete', 'manage_scholars', 'view_reports', 'manage_settings']
  }],
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
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

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.status.lockUntil && this.status.lockUntil > Date.now());
});

// Methods
adminSchema.methods.incLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.status.lockUntil && this.status.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'status.lockUntil': 1 },
      $set: { 'status.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'status.loginAttempts': 1 } };
  const maxAttempts = 5;
  
  if (this.status.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { 'status.lockUntil': Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { 'status.loginAttempts': 0, 'status.lastLogin': Date.now() },
    $unset: { 'status.lockUntil': 1 }
  });
};

// Indexes
adminSchema.index({ 'personalInfo.email': 1, organizationId: 1 });

export default mongoose.model('Admin', adminSchema);