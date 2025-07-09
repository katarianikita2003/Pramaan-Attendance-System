// deepDebug.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import Scholar from './src/models/Scholar.js';

dotenv.config();

async function deepDebug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');
    console.log('Connected to MongoDB');

    console.log('\n=== Testing Direct Bcrypt Operations ===');
    
    // Test bcrypt directly
    const testPassword = 'Admin111';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPassword, salt);
    const directTest = await bcrypt.compare(testPassword, hash);
    console.log('Direct bcrypt test:', directTest);
    console.log('Generated hash:', hash);

    console.log('\n=== Checking Admin1 Document ===');
    
    const admin1 = await Admin.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
    if (admin1) {
      console.log('Current hash:', admin1.credentials.passwordHash);
      
      // Try updating with a fresh approach
      console.log('\nGenerating fresh hash for Admin111...');
      const newHash = await bcrypt.hash('Admin111', 10);
      console.log('New hash:', newHash);
      
      // Update using MongoDB update operation
      const result = await Admin.updateOne(
        { 'personalInfo.email': 'admin1@gmail.com' },
        { $set: { 'credentials.passwordHash': newHash } }
      );
      console.log('Update result:', result);
      
      // Fetch again to verify
      const updatedAdmin = await Admin.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
      console.log('Hash after update:', updatedAdmin.credentials.passwordHash);
      
      // Test the password
      const testResult = await bcrypt.compare('Admin111', updatedAdmin.credentials.passwordHash);
      console.log('Password test after update:', testResult);
      
      // Also test with the model method
      if (updatedAdmin.comparePassword) {
        const methodTest = await updatedAdmin.comparePassword('Admin111');
        console.log('comparePassword method test:', methodTest);
      }
    }

    console.log('\n=== Checking for Schema Pre-Save Hooks ===');
    
    // Check if there are any pre-save hooks that might be interfering
    const admin2 = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' });
    if (admin2) {
      console.log('Testing with admin@demo.com...');
      
      // Create a completely new hash
      const newHash2 = '$2a$10$eZQz7HprwpB3BqqDYvYy8.KoV8HFa5PK6hQvLpYJxWyVlH1D7dMSq'; // This is 'admin123' hashed
      
      // Direct MongoDB update
      await Admin.collection.updateOne(
        { 'personalInfo.email': 'admin@demo.com' },
        { $set: { 'credentials.passwordHash': newHash2 } }
      );
      
      // Verify
      const verifyAdmin = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' });
      const testDirect = await bcrypt.compare('admin123', verifyAdmin.credentials.passwordHash);
      console.log('Direct update and test result:', testDirect);
    }

    console.log('\n=== Creating Fresh Test User ===');
    
    // Try creating a completely fresh user
    try {
      // First, remove if exists
      await Admin.deleteOne({ 'personalInfo.email': 'test@demo.com' });
      
      // Create new admin with known hash
      const testHash = await bcrypt.hash('test123', 10);
      const testAdmin = new Admin({
        personalInfo: {
          name: 'Test Admin',
          email: 'test@demo.com',
          phone: '1234567890'
        },
        organizationId: admin1.organizationId,
        credentials: {
          passwordHash: testHash
        },
        role: 'admin',
        status: 'active',
        isActive: true
      });
      
      await testAdmin.save();
      
      // Test immediately
      const savedAdmin = await Admin.findOne({ 'personalInfo.email': 'test@demo.com' });
      const freshTest = await bcrypt.compare('test123', savedAdmin.credentials.passwordHash);
      console.log('Fresh user password test:', freshTest);
      
      // Clean up
      await Admin.deleteOne({ 'personalInfo.email': 'test@demo.com' });
    } catch (err) {
      console.log('Fresh user test error:', err.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deepDebug();