// backend/src/models/Scholar.js
// Updated Scholar model with isActive field

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const scholarSchema = new mongoose.Schema({
  scholarId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
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
      lowercase: true,
      trim: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    }
  },
  academicInfo: {
    department: {
      type: String,
      required: true
    },
    course: {
      type: String,
      required: true
    },
    year: {
      type: String,
      required: true
    },
    section: String,
    rollNumber: String,
    admissionYear: Number,
    expectedGraduation: Number
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
    passwordChangedAt: Date
  },
  biometrics: {
    faceCommitment: {
      commitment: String,
      nullifier: String,
      timestamp: Date
    },
    fingerprintCommitment: {
      commitment: String,
      nullifier: String,
      timestamp: Date
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  // Add isActive field with default true
  isActive: {
    type: Boolean,
    default: true  // New scholars should be active by default
  },
  attendanceStats: {
    totalDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'graduated'],
    default: 'active'
  },
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      }
    }
  },
  devices: [{
    deviceId: String,
    deviceName: String,
    platform: String,
    lastActive: Date,
    pushToken: String
  }],
  flags: {
    isVerified: {
      type: Boolean,
      default: false
    },
    requirePasswordChange: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
scholarSchema.index({ 'personalInfo.email': 1 });
scholarSchema.index({ scholarId: 1 });
scholarSchema.index({ organizationId: 1 });
scholarSchema.index({ status: 1 });

// Virtual for full name
scholarSchema.virtual('fullName').get(function() {
  return this.personalInfo.name;
});

// Method to compare password
scholarSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.credentials.passwordHash);
};

// Method to set password
scholarSchema.methods.setPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.credentials.passwordHash = await bcrypt.hash(plainPassword, salt);
  this.credentials.passwordChangedAt = new Date();
};

// Method to update attendance stats
scholarSchema.methods.updateAttendanceStats = async function() {
  const Attendance = mongoose.model('Attendance');
  const attendanceCount = await Attendance.countDocuments({
    scholarId: this._id,
    status: 'present'
  });

  this.attendanceStats.presentDays = attendanceCount;
  this.attendanceStats.totalDays = 100; // This should be calculated based on academic calendar
  this.attendanceStats.absentDays = this.attendanceStats.totalDays - attendanceCount;
  this.attendanceStats.percentage = Math.round((attendanceCount / this.attendanceStats.totalDays) * 100);
  this.attendanceStats.lastUpdated = new Date();

  return this.save();
};

// Method to add device
scholarSchema.methods.addDevice = function(deviceInfo) {
  // Remove existing device with same ID
  this.devices = this.devices.filter(d => d.deviceId !== deviceInfo.deviceId);
  
  // Add new device
  this.devices.push({
    ...deviceInfo,
    lastActive: new Date()
  });

  // Keep only last 5 devices
  if (this.devices.length > 5) {
    this.devices = this.devices.slice(-5);
  }

  return this.save();
};

const Scholar = mongoose.model('Scholar', scholarSchema);

export default Scholar;

// // backend/src/models/Scholar.js
// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// const scholarSchema = new mongoose.Schema({
//   scholarId: {
//     type: String,
//     required: true,
//     unique: true,
//     uppercase: true,
//     trim: true
//   },
//   personalInfo: {
//     name: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     email: {
//       type: String,
//       required: true,
//       lowercase: true,
//       trim: true,
//       unique: true
//     },
//     phone: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     dateOfBirth: Date,
//     gender: {
//       type: String,
//       enum: ['male', 'female', 'other']
//     },
//     address: {
//       street: String,
//       city: String,
//       state: String,
//       country: String,
//       pincode: String
//     }
//   },
//   academicInfo: {
//     department: {
//       type: String,
//       required: true
//     },
//     course: {
//       type: String,
//       required: true
//     },
//     year: {
//       type: String,
//       required: true
//     },
//     section: String,
//     rollNumber: String,
//     admissionYear: Number,
//     expectedGraduation: Number
//   },
//   organizationId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Organization',
//     required: true
//   },
//   credentials: {
//     passwordHash: {
//       type: String,
//       required: true
//     },
//     passwordResetToken: String,
//     passwordResetExpires: Date,
//     passwordChangedAt: Date
//   },
//   biometrics: {
//     faceCommitment: {
//       commitment: String,
//       nullifier: String,
//       timestamp: Date
//     },
//     fingerprintCommitment: {
//       commitment: String,
//       nullifier: String,
//       timestamp: Date
//     },
//     registeredAt: {
//       type: Date,
//       default: Date.now
//     }
//   },
//   attendanceStats: {
//     totalDays: {
//       type: Number,
//       default: 0
//     },
//     presentDays: {
//       type: Number,
//       default: 0
//     },
//     absentDays: {
//       type: Number,
//       default: 0
//     },
//     percentage: {
//       type: Number,
//       default: 0
//     },
//     lastUpdated: Date
//   },
//   status: {
//     type: String,
//     enum: ['active', 'inactive', 'suspended', 'graduated'],
//     default: 'active'
//   },
//   settings: {
//     notifications: {
//       email: {
//         type: Boolean,
//         default: true
//       },
//       sms: {
//         type: Boolean,
//         default: false
//       },
//       push: {
//         type: Boolean,
//         default: true
//       }
//     },
//     privacy: {
//       showEmail: {
//         type: Boolean,
//         default: false
//       },
//       showPhone: {
//         type: Boolean,
//         default: false
//       }
//     }
//   },
//   devices: [{
//     deviceId: String,
//     deviceName: String,
//     platform: String,
//     lastActive: Date,
//     pushToken: String
//   }],
//   flags: {
//     isVerified: {
//       type: Boolean,
//       default: false
//     },
//     requirePasswordChange: {
//       type: Boolean,
//       default: false
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// scholarSchema.index({ 'personalInfo.email': 1 });
// scholarSchema.index({ scholarId: 1 });
// scholarSchema.index({ organizationId: 1 });
// scholarSchema.index({ status: 1 });

// // Virtual for full name
// scholarSchema.virtual('fullName').get(function() {
//   return this.personalInfo.name;
// });

// // Method to compare password
// scholarSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.credentials.passwordHash);
// };

// // Method to set password (use this when setting/updating passwords)
// scholarSchema.methods.setPassword = async function(plainPassword) {
//   const salt = await bcrypt.genSalt(10);
//   this.credentials.passwordHash = await bcrypt.hash(plainPassword, salt);
//   this.credentials.passwordChangedAt = new Date();
// };

// // Method to update attendance stats
// scholarSchema.methods.updateAttendanceStats = async function() {
//   const Attendance = mongoose.model('Attendance');
//   const attendanceCount = await Attendance.countDocuments({
//     scholarId: this._id,
//     status: 'present'
//   });

//   this.attendanceStats.presentDays = attendanceCount;
//   this.attendanceStats.totalDays = 100; // This should be calculated based on academic calendar
//   this.attendanceStats.absentDays = this.attendanceStats.totalDays - attendanceCount;
//   this.attendanceStats.percentage = Math.round((attendanceCount / this.attendanceStats.totalDays) * 100);
//   this.attendanceStats.lastUpdated = new Date();

//   return this.save();
// };

// // Method to add device
// scholarSchema.methods.addDevice = function(deviceInfo) {
//   // Remove existing device with same ID
//   this.devices = this.devices.filter(d => d.deviceId !== deviceInfo.deviceId);
  
//   // Add new device
//   this.devices.push({
//     ...deviceInfo,
//     lastActive: new Date()
//   });

//   // Keep only last 5 devices
//   if (this.devices.length > 5) {
//     this.devices = this.devices.slice(-5);
//   }

//   return this.save();
// };

// // REMOVED THE PROBLEMATIC PRE-SAVE HOOK
// // The password should already be hashed when it's set
// // We don't need to hash it again in the model

// const Scholar = mongoose.model('Scholar', scholarSchema);

// export default Scholar;