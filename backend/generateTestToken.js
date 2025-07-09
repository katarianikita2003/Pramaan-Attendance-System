// backend/generateTestToken.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Admin from './src/models/Admin.js';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

async function generateTestToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the admin
    const admin = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }

    console.log('✅ Found admin:', admin.personalInfo.email);
    console.log('Admin ID:', admin._id);
    console.log('Organization ID:', admin.organizationId);

    // Generate a fresh token
    const token = jwt.sign(
      { 
        userId: admin._id.toString(),
        organizationId: admin.organizationId.toString(),
        role: admin.role,
        permissions: admin.permissions || ['all']
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '7d' }
    );

    console.log('\n📋 Fresh JWT Token:');
    console.log('=====================================');
    console.log(token);
    console.log('=====================================');
    console.log('\n✅ Use this token in your mobile app for testing');

    // Verify the token works
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
    console.log('\n✅ Token verified successfully:');
    console.log(JSON.stringify(decoded, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
  }
}

generateTestToken();