// backend/scripts/createTestData.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Organization from '../src/models/Organization.js';
import Admin from '../src/models/Admin.js';
import Scholar from '../src/models/Scholar.js';

dotenv.config();

async function createTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if organization already exists
    let org = await Organization.findOne({ code: 'TEST001' });
    
    if (!org) {
      // Create test organization
      org = await Organization.create({
        name: 'Test University',
        code: 'TEST001',
        type: 'educational',
        contact: {
          email: 'admin@testuniversity.com',
          phone: '+91-9876543210',
          address: '123 Test Street, Test City, Test State, India - 123456'
        },
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139], // Delhi coordinates
          address: '123 Test Street, Test City, Test State, India - 123456'
        },
        settings: {
          attendanceMode: 'biometric',
          workingDays: [1, 2, 3, 4, 5], // Monday to Friday
          workingHours: {
            start: '09:00',
            end: '18:00'
          },
          requireLocation: true,
          locationRadius: 500
        },
        adminId: null // Will be set after admin creation
      });
      console.log('✓ Organization created:', org.code);
    } else {
      console.log('✓ Organization already exists:', org.code);
    }

    console.log('✓ Organization created:', org.code);

    // Check if admin already exists
    let admin = await Admin.findOne({ email: 'admin@test.com' });
    
    if (!admin) {
      // Create admin with correct schema structure
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await Admin.create({
        personalInfo: {
          name: 'Test Admin',
          email: 'admin@test.com',
          phone: '+91-9876543210'
        },
        credentials: {
          passwordHash: hashedPassword
        },
        organizationId: org._id,
        role: 'super_admin',
        status: 'active'
      });
      console.log('✓ Admin created:', admin.personalInfo.email);
    } else {
      console.log('✓ Admin already exists:', admin.personalInfo.email);
    }

    console.log('✓ Admin created:', admin.email);

    // Create test scholars
    const scholars = [];
    for (let i = 1; i <= 5; i++) {
      const scholar = await Scholar.create({
        scholarId: `SCHOLAR${i}`,
        personalInfo: {
          name: `Test Scholar ${i}`,
          email: `scholar${i}@test.com`,
          phone: `+91-98765432${10 + i}`,
          dateOfBirth: new Date(2000, 0, i)
        },
        academicInfo: {
          department: i % 2 === 0 ? 'Computer Science' : 'Engineering',
          program: 'B.Tech',
          semester: i,
          year: Math.ceil(i / 2)
        },
        organizationId: org._id,
        credentials: {
          passwordHash: hashedPassword
        },
        status: 'active'
      });
      scholars.push(scholar);
      console.log(`✓ Scholar created: ${scholar.scholarId}`);
    }

    console.log('\n=== Test Data Created Successfully ===');
    console.log('\nLogin Credentials:');
    console.log('Admin: admin@test.com / admin123');
    console.log('Scholars: scholar1@test.com to scholar5@test.com / admin123');
    console.log('Organization Code: TEST001');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();