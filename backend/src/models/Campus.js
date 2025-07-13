// backend/src/models/Campus.js
import mongoose from 'mongoose';

const campusSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 20
  },
  type: {
    type: String,
    enum: ['main', 'branch', 'satellite', 'remote'],
    default: 'main'
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    }
  },
  boundaries: {
    type: {
      type: String,
      enum: ['circle', 'polygon'],
      default: 'circle'
    },
    center: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    radius: {
      type: Number, // in meters
      default: 500,
      min: 50,
      max: 5000
    },
    polygon: [{
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    }]
  },
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
  operatingHours: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '18:00' }
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '18:00' }
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '18:00' }
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '18:00' }
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '18:00' }
    },
    saturday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '13:00' }
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '13:00' }
    }
  },
  attendanceSettings: {
    lateThreshold: {
      type: Number, // minutes after openTime
      default: 15
    },
    earlyCheckInWindow: {
      type: Number, // minutes before openTime
      default: 30
    },
    overtimeThreshold: {
      type: Number, // minutes after closeTime
      default: 30
    },
    minimumStayDuration: {
      type: Number, // minutes
      default: 60
    },
    allowWeekendAttendance: {
      type: Boolean,
      default: false
    },
    allowHolidayAttendance: {
      type: Boolean,
      default: false
    }
  },
  facilities: [{
    name: String,
    type: {
      type: String,
      enum: ['classroom', 'lab', 'library', 'cafeteria', 'auditorium', 'sports', 'parking', 'other']
    },
    capacity: Number,
    location: {
      building: String,
      floor: String,
      room: String
    }
  }],
  contactInfo: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    emergencyContact: {
      name: String,
      phone: String,
      email: String
    }
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  holidays: [{
    date: Date,
    name: String,
    type: {
      type: String,
      enum: ['public', 'institutional', 'emergency'],
      default: 'institutional'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    wifiSSIDs: [String], // WiFi networks for indoor positioning
    beaconIds: [String], // Bluetooth beacons for proximity
    ipRanges: [String]   // IP ranges for network-based validation
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
campusSchema.index({ organization: 1, code: 1 });
campusSchema.index({ 'boundaries.center': '2dsphere' });
campusSchema.index({ geoLocation: '2dsphere' });

// Virtual for full address
campusSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.postalCode}, ${this.address.country}`;
});

// Pre-save middleware
campusSchema.pre('save', function(next) {
  // Set geoLocation from boundaries center
  if (this.boundaries && this.boundaries.center) {
    this.geoLocation = {
      type: 'Point',
      coordinates: [this.boundaries.center.lng, this.boundaries.center.lat]
    };
  }

  // Auto-generate code if not provided
  if (!this.code && this.name) {
    this.code = this.name
      .substring(0, 10)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') + 
      '-' + 
      Date.now().toString(36).toUpperCase().substring(-4);
  }

  next();
});

// Instance method to check if a location is within campus boundaries
campusSchema.methods.isLocationWithinBoundaries = function(lat, lng) {
  if (this.boundaries.type === 'circle') {
    // Calculate distance from center
    const distance = calculateDistance(
      lat, 
      lng, 
      this.boundaries.center.lat, 
      this.boundaries.center.lng
    );
    return distance <= this.boundaries.radius;
  } else if (this.boundaries.type === 'polygon' && this.boundaries.polygon.length > 2) {
    // Point-in-polygon algorithm
    return isPointInPolygon(lat, lng, this.boundaries.polygon);
  }
  return false;
};

// Instance method to check if campus is open at a given time
campusSchema.methods.isOpenAt = function(date = new Date()) {
  const dayOfWeek = date.toLocaleLowerCase(date.toLocaleString('en-US', { weekday: 'long' })).toLowerCase();
  const timeString = date.toTimeString().substring(0, 5); // HH:MM format
  
  const daySchedule = this.operatingHours[dayOfWeek];
  if (!daySchedule || !daySchedule.isOpen) {
    return false;
  }

  return timeString >= daySchedule.openTime && timeString <= daySchedule.closeTime;
};

// Instance method to check if a date is a holiday
campusSchema.methods.isHoliday = function(date) {
  const dateString = date.toDateString();
  return this.holidays.some(holiday => 
    holiday.date.toDateString() === dateString
  );
};

// Static method to find nearby campuses
campusSchema.statics.findNearbyCampuses = async function(lat, lng, maxDistance = 5000) {
  return this.find({
    isActive: true,
    geoLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Static method to get all campuses for an organization
campusSchema.statics.getOrganizationCampuses = async function(organizationId) {
  return this.find({ 
    organization: organizationId,
    isActive: true 
  }).sort({ type: 1, name: 1 });
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Helper function for point-in-polygon algorithm
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

const Campus = mongoose.model('Campus', campusSchema);

export default Campus;