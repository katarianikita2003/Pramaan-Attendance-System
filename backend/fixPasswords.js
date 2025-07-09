// fixPasswords.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import Scholar from './src/models/Scholar.js';

dotenv.config();

async function fixPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');
    console.log('Connected to MongoDB');

    // Fix admin passwords
    console.log('\n=== Fixing Admin Passwords ===');
    
    // Fix admin1@gmail.com
    const admin1 = await Admin.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
    if (admin1) {
      console.log('Updating password for admin1@gmail.com...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin111', salt);
      admin1.credentials.passwordHash = hashedPassword;
      await admin1.save();
      
      // Verify the update
      const test = await bcrypt.compare('Admin111', admin1.credentials.passwordHash);
      console.log('Password updated and verified:', test);
    }

    // Fix admin@demo.com
    const admin2 = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' });
    if (admin2) {
      console.log('\nUpdating password for admin@demo.com...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      admin2.credentials.passwordHash = hashedPassword;
      await admin2.save();
      
      // Verify the update
      const test = await bcrypt.compare('admin123', admin2.credentials.passwordHash);
      console.log('Password updated and verified:', test);
    }

    // Fix scholar password
    console.log('\n=== Fixing Scholar Password ===');
    
    const scholar = await Scholar.findOne({ 'personalInfo.email': 'john@demo.com' });
    if (scholar) {
      console.log('Updating password for john@demo.com...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('scholar123', salt);
      scholar.credentials.passwordHash = hashedPassword;
      await scholar.save();
      
      // Verify the update
      const test = await bcrypt.compare('scholar123', scholar.credentials.passwordHash);
      console.log('Password updated and verified:', test);
    }

    console.log('\n✅ All passwords have been updated successfully!');
    console.log('\nYou can now login with:');
    console.log('- Admin: admin1@gmail.com / Admin111');
    console.log('- Admin: admin@demo.com / admin123');
    console.log('- Scholar: john@demo.com / scholar123 (with org code: DEMO123)');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPasswords();