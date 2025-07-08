// backend/src/models/AttendanceProof.js
import mongoose from 'mongoose';

const attendanceProofSchema = new mongoose.Schema({
  scholarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholar',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    time: {
      type: Date,
      required: true
    },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    },
    method: {
      type: String,
      enum: ['biometric', 'qr', 'manual'],
      required: true
    },
    deviceInfo: {
      deviceId: String,
      deviceType: String,
      appVersion: String
    }
  },
  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    },
    method: {
      type: String,
      enum: ['biometric', 'qr', 'manual', 'auto']
    }
  },
  zkProof: {
    proof: {
      type: String,
      required: true
    },
    publicSignals: [String],
    verificationHash: String,
    nullifier: String
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['onchain', 'offchain']
    },
    transactionHash: String
  },
  metadata: {
    duration: Number, // in minutes
    status: {
      type: String,
      enum: ['present', 'late', 'half-day', 'absent'],
      default: 'present'
    },
    remarks: String,
    isManualEntry: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  anomalies: [{
    type: {
      type: String,
      enum: ['location_mismatch', 'time_anomaly', 'device_change', 'suspicious_pattern']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    detectedAt: Date
  }],
  certificate: {
    isGenerated: {
      type: Boolean,
      default: false
    },
    generatedAt: Date,
    certificateUrl: String,
    certificateHash: String
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

// Compound indexes
attendanceProofSchema.index({ scholarId: 1, date: -1 });
attendanceProofSchema.index({ organizationId: 1, date: -1 });
attendanceProofSchema.index({ date: -1, 'metadata.status': 1 });
attendanceProofSchema.index({ 'zkProof.nullifier': 1 }, { unique: true });

// Ensure one attendance per scholar per day
attendanceProofSchema.index(
  { 
    scholarId: 1, 
    date: 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: { 
      'metadata.isManualEntry': false 
    }
  }
);

// Virtual for duration calculation
attendanceProofSchema.virtual('duration').get(function() {
  if (this.checkIn?.time && this.checkOut?.time) {
    const duration = (this.checkOut.time - this.checkIn.time) / (1000 * 60); // in minutes
    return Math.round(duration);
  }
  return null;
});

// Methods
attendanceProofSchema.methods.calculateStatus = function(organizationSettings) {
  const checkInTime = new Date(this.checkIn.time);
  const [hours, minutes] = organizationSettings.workingHours.start.split(':');
  const expectedTime = new Date(checkInTime);
  expectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const lateByMinutes = (checkInTime - expectedTime) / (1000 * 60);
  
  if (lateByMinutes <= 5) {
    this.metadata.status = 'present';
  } else if (lateByMinutes <= 30) {
    this.metadata.status = 'late';
  } else if (lateByMinutes <= 240) { // 4 hours
    this.metadata.status = 'half-day';
  } else {
    this.metadata.status = 'absent';
  }
  
  return this.metadata.status;
};

attendanceProofSchema.methods.checkForAnomalies = async function(previousAttendances) {
  const anomalies = [];
  
  // Check location anomaly
  if (previousAttendances.length > 0 && this.checkIn.location) {
    const lastAttendance = previousAttendances[0];
    if (lastAttendance.checkIn.location) {
      const distance = calculateDistance(
        this.checkIn.location,
        lastAttendance.checkIn.location
      );
      
      if (distance > 1000) { // More than 1km
        anomalies.push({
          type: 'location_mismatch',
          description: `Significant location change detected (${distance}m)`,
          severity: 'medium',
          detectedAt: new Date()
        });
      }
    }
  }
  
  // Check device change
  if (previousAttendances.length > 0) {
    const lastDevice = previousAttendances[0].checkIn.deviceInfo?.deviceId;
    if (lastDevice && this.checkIn.deviceInfo?.deviceId !== lastDevice) {
      anomalies.push({
        type: 'device_change',
        description: 'Different device used for attendance',
        severity: 'low',
        detectedAt: new Date()
      });
    }
  }
  
  this.anomalies = anomalies;
  return anomalies;
};

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1, coord2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return Math.round(R * c);
}

// Pre-save middleware
attendanceProofSchema.pre('save', function(next) {
  // Set date to start of day for unique index
  const date = new Date(this.date);
  date.setHours(0, 0, 0, 0);
  this.date = date;
  
  // Calculate duration if check-out exists
  if (this.checkOut?.time) {
    this.metadata.duration = this.duration;
  }
  
  this.updatedAt = Date.now();
  next();
});

const AttendanceProof = mongoose.model('AttendanceProof', attendanceProofSchema);

export default AttendanceProof;