// backend/src/models/Admin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
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
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    profilePicture: String
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
    lastPasswordChange: Date,
    twoFactorSecret: String,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'manager', 'viewer'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_scholars',
      'view_scholars',
      'manage_attendance',
      'view_attendance',
      'manage_organization',
      'view_reports',
      'export_data'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    success: Boolean
  }],
  settings: {
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
    dashboard: {
      defaultView: {
        type: String,
        default: 'overview'
      },
      widgets: [String]
    }
  },
  metadata: {
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }
}, {
  timestamps: true
});

// Indexes
// adminSchema.index({ 'personalInfo.email': 1 });
adminSchema.index({ organizationId: 1 });
adminSchema.index({ role: 1 });

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return this.personalInfo.name;
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.credentials.passwordHash);
};

// Method to set password (use this when setting/updating passwords)
adminSchema.methods.setPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.credentials.passwordHash = await bcrypt.hash(plainPassword, salt);
  this.credentials.lastPasswordChange = new Date();
};

// Method to check permission
adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions.includes(permission);
};

// Method to record login
adminSchema.methods.recordLogin = async function(ipAddress, userAgent, success = true) {
  this.loginHistory.push({
    ipAddress,
    userAgent,
    success,
    timestamp: new Date()
  });

  if (success) {
    this.metadata.lastLogin = new Date();
    this.metadata.loginCount += 1;
  }

  // Keep only last 10 login records
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(-10);
  }

  return this.save();
};

// Method to handle login attempts
adminSchema.methods.incLoginAttempts = async function() {
  // Implement login attempt tracking if needed
  return this.save();
};

adminSchema.methods.resetLoginAttempts = async function() {
  // Reset login attempts if implemented
  return this.save();
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;