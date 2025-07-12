// backend/createTestScholar.js
// This creates a test scholar with the CORRECT schema structure

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function createTestScholar() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const { default: Scholar } = await import('./src/models/Scholar.js');
    const { default: Organization } = await import('./src/models/Organization.js');
    
    // Find an organization
    const organization = await Organization.findOne();
    if (!organization) {
      console.log('❌ No organization found. Please create an organization first.');
      return;
    }
    
    console.log(`📍 Using organization: ${organization.name}`);
    
    // Create test scholar data with CORRECT schema
    const testScholarData = {
      scholarId: 'TEST001',
      personalInfo: {
        name: 'Test Scholar',
        email: 'test.scholar@example.com',
        phone: '+1234567890',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'male',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          pincode: '12345'
        }
      },
      academicInfo: {
        department: 'Computer Science',
        course: 'B.Tech',
        year: '3rd Year',
        section: 'A',
        rollNumber: 'CS001',
        admissionYear: 2021,
        expectedGraduation: 2025
      },
      organizationId: organization._id,
      credentials: {
        passwordHash: await bcrypt.hash('Test@123', 10)
      },
      // CORRECT biometrics structure - NO biometricData!
      biometrics: {
        faceCommitment: {
          commitment: 'test-face-commitment-hash',
          nullifier: 'test-face-nullifier',
          timestamp: new Date()
        },
        fingerprintCommitment: {
          commitment: 'test-fingerprint-commitment-hash',
          nullifier: 'test-fingerprint-nullifier',
          timestamp: new Date()
        },
        registeredAt: new Date()
      },
      status: 'active'
    };
    
    // Check if scholar already exists
    const existing = await Scholar.findOne({ 
      $or: [
        { scholarId: testScholarData.scholarId },
        { 'personalInfo.email': testScholarData.personalInfo.email }
      ]
    });
    
    if (existing) {
      console.log('⚠️  Test scholar already exists');
      console.log(`   Email: ${existing.personalInfo.email}`);
      console.log(`   ID: ${existing.scholarId}`);
    } else {
      // Create the scholar
      const scholar = new Scholar(testScholarData);
      await scholar.save();
      
      console.log('✅ Test scholar created successfully!');
      console.log(`   Email: ${scholar.personalInfo.email}`);
      console.log(`   Password: Test@123`);
      console.log(`   Scholar ID: ${scholar.scholarId}`);
      console.log(`   Organization Code: ${organization.code}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('   Duplicate key error - check for unique constraint violations');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
createTestScholar().catch(console.error);