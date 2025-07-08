// backend/src/models/Organization.js
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['educational', 'corporate', 'government', 'ngo', 'other'],
    default: 'educational'
  },
  contact: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    website: String
  },
  location: {
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    radius: {
      type: Number,
      default: 100 // meters
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    scholarLimit: {
      type: Number,
      default: 50
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    attendanceMode: {
      type: String,
      enum: ['biometric', 'qr', 'both'],
      default: 'both'
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5] // Monday to Friday
    },
    requireLocation: {
      type: Boolean,
      default: true
    },
    autoApproveScholars: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    totalScholars: {
      type: Number,
      default: 0
    },
    activeScholars: {
      type: Number,
      default: 0
    },
    totalAttendance: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
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
organizationSchema.index({ code: 1 });
organizationSchema.index({ 'contact.email': 1 });
organizationSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for scholar count
organizationSchema.virtual('scholarCount', {
  ref: 'Scholar',
  localField: '_id',
  foreignField: 'organizationId',
  count: true
});

// Methods
organizationSchema.methods.canAddMoreScholars = function() {
  return this.stats.totalScholars < this.subscription.scholarLimit;
};

organizationSchema.methods.isSubscriptionActive = function() {
  return this.subscription.isActive && 
         this.subscription.endDate > new Date();
};

// Update stats
organizationSchema.methods.updateStats = async function() {
  const Scholar = mongoose.model('Scholar');
  const totalScholars = await Scholar.countDocuments({ 
    organizationId: this._id 
  });
  const activeScholars = await Scholar.countDocuments({ 
    organizationId: this._id,
    status: 'active'
  });
  
  this.stats.totalScholars = totalScholars;
  this.stats.activeScholars = activeScholars;
  
  return this.save();
};

// Pre-save middleware
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;