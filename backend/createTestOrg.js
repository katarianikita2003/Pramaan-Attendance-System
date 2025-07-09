// backend/createTestOrg.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './src/models/Admin.js';
import Organization from './src/models/Organization.js';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

async function createTestOrganization() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create organization
    const organization = new Organization({
      name: 'Demo University',
      code: 'DEMO123',
      type: 'educational',
      contact: {
        email: 'admin@demo.com',
        phone: '+1234567890',
        address: '123 Demo Street, Demo City'
      },
      subscription: {
        plan: 'free',
        scholarLimit: 50,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      isActive: true,
      isVerified: true
    });

    await organization.save();
    console.log('✅ Organization created:', organization.code);

    // Update existing admin or create new one
    const adminId = '686d6526f138e003fa0fc473';
    let admin = await Admin.findById(adminId);

    if (admin) {
      // Update existing admin
      admin.organizationId = organization._id;
      await admin.save();
      console.log('✅ Updated existing admin with new organization');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = new Admin({
        _id: adminId,
        organizationId: organization._id,
        personalInfo: {
          name: 'Demo Admin',
          email: 'admin@demo.com'
        },
        credentials: {
          password: hashedPassword
        },
        role: 'admin',
        permissions: ['all'],
        isActive: true
      });
      await admin.save();
      console.log('✅ Created new admin');
    }

    console.log('\n📋 Summary:');
    console.log('Organization Code:', organization.code);
    console.log('Admin Email:', admin.personalInfo.email);
    console.log('Admin Password: admin123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
  }
}

createTestOrganization();