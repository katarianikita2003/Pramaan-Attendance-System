// testPasswords.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import Scholar from './src/models/Scholar.js';
dotenv.config();
async function testPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');
    console.log('Connected to MongoDB');
    // Test admin passwords
    console.log('\n=== Testing Admin Passwords ===');
    const admin1 = await Admin.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
    if (admin1) {
      console.log('Admin1 found');
      const test1 = await bcrypt.compare('Admin111', admin1.credentials.passwordHash);
      console.log('Password "Admin111" matches:', test1);
      // Also test with the model method
      if (admin1.comparePassword) {
        const test1b = await admin1.comparePassword('Admin111');
        console.log('Password "Admin111" matches (using method):', test1b);
      }
    }
    const admin2 = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' });
    if (admin2) {
      console.log('\nAdmin2 found');
      const test2 = await bcrypt.compare('admin123', admin2.credentials.passwordHash);
      console.log('Password "admin123" matches:', test2);
    }
    // Test scholar password
    console.log('\n=== Testing Scholar Password ===');
    const scholar = await Scholar.findOne({ 'personalInfo.email': 'john@demo.com' });
    if (scholar) {
      console.log('Scholar found');
      const test3 = await bcrypt.compare('scholar123', scholar.credentials.passwordHash);
      console.log('Password "scholar123" matches:', test3);
      if (scholar.comparePassword) {
        const test3b = await scholar.comparePassword('scholar123');
        console.log('Password "scholar123" matches (using method):', test3b);
      }
    }
    // List all admins for debugging
    console.log('\n=== All Admins ===');
    const allAdmins = await Admin.find({}, 'personalInfo.email status isActive');
    allAdmins.forEach(admin => {
      console.log(`- ${admin.personalInfo.email} (status: ${admin.status}, isActive: ${admin.isActive})`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
testPasswords();
