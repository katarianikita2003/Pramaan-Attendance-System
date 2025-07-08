// backend/src/models/Organization.js
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
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
    index: true
  },
  type: {
    type: String,
    enum: ['educational', 'corporate', 'government', 'other'],
    default: 'educational'
  },
  contact: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: String,
    address: String
  },
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    radius: {
      type: Number,
      default: 500 // meters
    },
    campuses: [{
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      radius: Number
    }]
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    scholarLimit: {
      type: Number,
      default: 50
    },
    currentCount: {
      type: Number,
      default: 0
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active'
    }
  },
  settings: {
    attendanceWindow: {
      start: {
        type: String,
        default: '08:00'
      },
      end: {
        type: String,
        default: '10:00'
      }
    },
    lateThreshold: {
      type: Number,
      default: 15 // minutes
    },
    requireLocation: {
      type: Boolean,
      default: true
    },
    allowMultipleCheckIns: {
      type: Boolean,
      default: false
    }
  },
  branding: {
    logo: String,
    primaryColor: {
      type: String,
      default: '#1976D2'
    }
  },
  isActive: {
    type: Boolean,
    default: true
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

// Methods
organizationSchema.methods.canAddMoreScholars = function() {
  return this.subscription.currentCount < this.subscription.scholarLimit;
};

organizationSchema.methods.incrementScholarCount = function() {
  this.subscription.currentCount += 1;
  return this.save();
};

organizationSchema.methods.isWithinAttendanceWindow = function() {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= this.settings.attendanceWindow.start && 
         currentTime <= this.settings.attendanceWindow.end;
};

// Indexes
organizationSchema.index({ 'contact.email': 1 });
organizationSchema.index({ createdAt: -1 });

export default mongoose.model('Organization', organizationSchema);