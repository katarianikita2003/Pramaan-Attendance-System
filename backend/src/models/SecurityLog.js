// backend/src/models/SecurityLog.js
import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'BIOMETRIC_MISMATCH',
      'ATTENDANCE_MARKED',
      'INVALID_LOGIN_ATTEMPT',
      'DUPLICATE_BIOMETRIC_ATTEMPT',
      'LOCATION_SPOOFING_DETECTED',
      'UNAUTHORIZED_ACCESS',
      'BIOMETRIC_REGISTRATION',
      'BIOMETRIC_REVOCATION',
      'SUSPICIOUS_ACTIVITY'
    ],
    required: true,
    index: true
  },
  
  severity: {
    type: String,
    enum: ['info', 'warning', 'high', 'critical'],
    default: 'info',
    index: true
  },
  
  scholar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    index: true
  },
  
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  ipAddress: String,
  userAgent: String,
  
  resolved: {
    type: Boolean,
    default: false
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  resolvedAt: Date,
  
  resolutionNotes: String
}, {
  timestamps: true
});

// Indexes for efficient querying
securityLogSchema.index({ createdAt: -1 });
securityLogSchema.index({ organization: 1, type: 1, createdAt: -1 });
securityLogSchema.index({ scholar: 1, type: 1 });
securityLogSchema.index({ severity: 1, resolved: 1 });

// Static method to log security event
securityLogSchema.statics.logEvent = async function(eventData) {
  const log = new this(eventData);
  return await log.save();
};

// Static method to get recent security events
securityLogSchema.statics.getRecentEvents = async function(organizationId, limit = 10) {
  return this.find({ 
    organization: organizationId,
    severity: { $in: ['high', 'critical'] },
    resolved: false
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('scholar', 'scholarId personalInfo.name')
  .populate('admin', 'name email');
};

// Instance method to resolve a security event
securityLogSchema.methods.resolve = async function(adminId, notes) {
  this.resolved = true;
  this.resolvedBy = adminId;
  this.resolvedAt = new Date();
  this.resolutionNotes = notes;
  return await this.save();
};

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);

export default SecurityLog;