import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['university', 'school', 'corporate', 'government'],
    required: true
  },
  admin: {
    name: String,
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  settings: {
    locationBounds: {
      center: {
        latitude: Number,
        longitude: Number
      },
      radius: { type: Number, default: 500 } // meters
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' }
    },
    attendanceRules: {
      allowLateCheckIn: { type: Number, default: 15 }, // minutes
      allowEarlyCheckOut: { type: Number, default: 15 }, // minutes
      minimumWorkHours: { type: Number, default: 8 },
      overtimeThreshold: { type: Number, default: 9 }
    },
    biometricRequirements: {
      fingerprintRequired: { type: Boolean, default: true },
      faceRequired: { type: Boolean, default: false },
      multiFactorRequired: { type: Boolean, default: false }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    maxScholars: { type: Number, default: 50 }
  },
  stats: {
    totalScholars: { type: Number, default: 0 },
    activeScholars: { type: Number, default: 0 },
    totalAttendanceRecords: { type: Number, default: 0 }
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastModifiedBy: String
  },
  isActive: { type: Boolean, default: true }
});

// Methods
OrganizationSchema.methods.isSubscriptionValid = function() {
  return this.subscription.status === 'active' && 
         (!this.subscription.endDate || this.subscription.endDate > new Date());
};

OrganizationSchema.methods.canAddMoreScholars = function() {
  return this.stats.totalScholars < this.subscription.maxScholars;
};

export default mongoose.model('Organization', OrganizationSchema);