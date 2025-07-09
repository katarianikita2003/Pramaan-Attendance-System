// checkModels.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import Scholar from './src/models/Scholar.js';

dotenv.config();

async function checkModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');
    console.log('Connected to MongoDB');

    // Check Admin model
    console.log('\n=== Checking Admin Model ===');
    const admin = await Admin.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
    if (admin) {
      console.log('Admin document structure:');
      console.log('- Has comparePassword method:', typeof admin.comparePassword === 'function');
      console.log('- Password hash exists:', !!admin.credentials?.passwordHash);
      console.log('- Password hash length:', admin.credentials?.passwordHash?.length);
      console.log('- Password hash starts with:', admin.credentials?.passwordHash?.substring(0, 10) + '...');
      
      // Check the actual schema methods
      console.log('\nAdmin schema methods:', Object.getOwnPropertyNames(Admin.schema.methods));
      console.log('Admin schema statics:', Object.getOwnPropertyNames(Admin.schema.statics));
    }

    // Check Scholar model
    console.log('\n=== Checking Scholar Model ===');
    const scholar = await Scholar.findOne({ 'personalInfo.email': 'john@demo.com' });
    if (scholar) {
      console.log('Scholar document structure:');
      console.log('- Has comparePassword method:', typeof scholar.comparePassword === 'function');
      console.log('- Password hash exists:', !!scholar.credentials?.passwordHash);
      console.log('- Password hash length:', scholar.credentials?.passwordHash?.length);
      console.log('- Password hash starts with:', scholar.credentials?.passwordHash?.substring(0, 10) + '...');
      
      // Check the actual schema methods
      console.log('\nScholar schema methods:', Object.getOwnPropertyNames(Scholar.schema.methods));
      console.log('Scholar schema statics:', Object.getOwnPropertyNames(Scholar.schema.statics));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkModels();