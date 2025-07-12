// backend/activateScholars.js
// This script activates all existing scholars

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function activateScholars() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const { default: Scholar } = await import('./src/models/Scholar.js');
    
    // Update all scholars to be active
    const result = await Scholar.updateMany(
      { isActive: { $ne: true } },
      { $set: { isActive: true } }
    );
    
    console.log(`✅ Activated ${result.modifiedCount} scholars`);
    
    // Show current scholars
    const scholars = await Scholar.find({}, 'scholarId personalInfo.name personalInfo.email isActive');
    console.log('\nCurrent scholars:');
    scholars.forEach(scholar => {
      console.log(`- ${scholar.scholarId}: ${scholar.personalInfo.name} (${scholar.personalInfo.email}) - Active: ${scholar.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

activateScholars().catch(console.error);