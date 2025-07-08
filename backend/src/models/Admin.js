// backend/src/models/Admin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
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
    phone: String,
    profilePicture: String
  },
  credentials: {
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now
    }
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'all',
      'view_scholars', 
      'manage_scholars',
      'view_attendance',
      'manage_attendance',
      'view_reports',
      'manage_organization',
      'manage_admins'
    ]
  }],
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  },
  activity: {
    lastLogin: Date,
    lastActivity: Date,
    ipAddress: String,
    userAgent: String
  },
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
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
adminSchema.index({ 'personalInfo.email': 1 });
adminSchema.index({ organizationId: 1, role: 1 });
adminSchema.index({ isActive: 1 });

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return this.personalInfo.name;
});

// Check if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Methods
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.credentials.password);
};

adminSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    {
      id: this._id,
      organizationId: this.organizationId,
      role: this.role,
      email: this.personalInfo.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '1d' }
  );
  return token;
};

adminSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.security.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.security.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  
  return resetToken;
};

adminSchema.methods.incLoginAttempts = async function() {
  // Reset attempts if lock has expired
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { 'security.loginAttempts': 1 },
      $unset: { 'security.lockUntil': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

adminSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { 'security.loginAttempts': 0 },
    $unset: { 'security.lockUntil': 1 }
  });
};

adminSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes('all') || this.permissions.includes(permission);
};

// Pre-save middleware
adminSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('credentials.password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.credentials.password = await bcrypt.hash(this.credentials.password, salt);
    this.credentials.lastPasswordChange = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;