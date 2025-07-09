// addTestUser.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Organization from './src/models/Organization.js';
import Admin from './src/models/Admin.js';
import Scholar from './src/models/Scholar.js';
dotenv.config();
async function addTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');
    console.log('Connected to MongoDB');
    // Check if demo org exists
    let demoOrg = await Organization.findOne({ code: 'DEMO123' });
    if (!demoOrg) {
      // Create demo organization with correct schema
      demoOrg = await Organization.create({
        name: 'Demo University',
        code: 'DEMO123',
        type: 'educational', // Changed from 'university' to match enum
        contact: {
          email: 'admin@demouniversity.edu',
          phone: '+91-9876543210',
          address: '123 Demo Street, Demo City, Demo State, India - 110001'
        },
        address: {
          street: '123 Demo Street',
          city: 'Demo City',
          state: 'Demo State',
          country: 'India',
          zipCode: '110001'
        },
        location: {
          coordinates: {
            latitude: 28.6139,
            longitude: 77.2090
          },
          radius: 1000
        },
        status: 'active',
        settings: {
          attendanceMode: 'biometric',
          workingHours: {
            start: '09:00',
            end: '18:00'
          },
          allowedRadius: 1000,
          requireLocation: true,
          requireBiometric: true
        }
      });
      console.log('Created organization:', demoOrg.code);
    }
    // Check if admin exists
    const existingAdmin = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' });
    if (!existingAdmin) {
      // Create admin with the password they're trying to use
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await Admin.create({
        personalInfo: {
          name: 'Demo Admin',
          email: 'admin@demo.com',
          phone: '9876543210',
        },
        organizationId: demoOrg._id,
        credentials: {
          passwordHash: hashedPassword,
        },
        role: 'admin',
        status: 'active',
        isActive: true,
        permissions: [
          'manage_scholars',
          'view_scholars',
          'manage_attendance',
          'view_attendance',
          'manage_organization',
          'view_reports',
          'export_data'
        ]
      });
      console.log('Created admin:', admin.personalInfo.email);
      // Update org with admin ID if the field exists
      if (demoOrg.adminId !== undefined) {
        demoOrg.adminId = admin._id;
        await demoOrg.save();
      }
    }
    // Also create an admin with the credentials being used in the app
    const admin1Exists = await Admin.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
    if (!admin1Exists) {
      const hashedPassword1 = await bcrypt.hash('Admin111', 10);
      await Admin.create({
        personalInfo: {
          name: 'Admin User',
          email: 'admin1@gmail.com',
          phone: '9876543211',
        },
        organizationId: demoOrg._id,
        credentials: {
          passwordHash: hashedPassword1,
        },
        role: 'admin',
        status: 'active',
        isActive: true,
        permissions: [
          'manage_scholars',
          'view_scholars',
          'manage_attendance',
          'view_attendance',
          'manage_organization',
          'view_reports',
          'export_data'
        ]
      });
      console.log('Created admin: admin1@gmail.com');
    }
    // Create demo scholars
    const scholar1Exists = await Scholar.findOne({ scholarId: 'SCH001' });
    if (!scholar1Exists) {
      const scholarPassword = await bcrypt.hash('scholar123', 10);
      await Scholar.create({
        personalInfo: {
          name: 'John Doe',
          email: 'john@demo.com',
          phone: '9876543211',
        },
        academicInfo: {
          department: 'Computer Science',
          course: 'B.Tech',
          year: '3rd Year',
          scholarId: 'SCH001',
        },
        organizationId: demoOrg._id,
        scholarId: 'SCH001',
        credentials: {
          passwordHash: scholarPassword,
        },
        status: 'active',
      });
      console.log('Created scholar: john@demo.com');
    }
    console.log('\n=== Login Credentials ===');
    console.log('Organization Code: DEMO123');
    console.log('\nAdmin Logins:');
    console.log('1. Email: admin@demo.com, Password: admin123');
    console.log('2. Email: admin1@gmail.com, Password: Admin111');
    console.log('\nScholar Login:');
    console.log('Email: john@demo.com, Password: scholar123');
    console.log('========================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
addTestUser();
