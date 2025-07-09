// backend/checkDatabase.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import Organization from './src/models/Organization.js';
import Scholar from './src/models/Scholar.js';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check organizations
    console.log('\n📋 ORGANIZATIONS:');
    const organizations = await Organization.find({}).select('_id name code isActive');
    if (organizations.length === 0) {
      console.log('❌ No organizations found in database');
    } else {
      organizations.forEach(org => {
        console.log(`- ${org.name} (${org.code}) - ID: ${org._id} - Active: ${org.isActive}`);
      });
    }

    // Check admins
    console.log('\n👤 ADMINS:');
    const admins = await Admin.find({})
      .select('_id personalInfo.name personalInfo.email organizationId role isActive')
      .populate('organizationId', 'name code');
    
    if (admins.length === 0) {
      console.log('❌ No admins found in database');
    } else {
      for (const admin of admins) {
        console.log(`\n- Name: ${admin.personalInfo.name}`);
        console.log(`  Email: ${admin.personalInfo.email}`);
        console.log(`  ID: ${admin._id}`);
        console.log(`  Role: ${admin.role}`);
        console.log(`  Active: ${admin.isActive}`);
        
        if (admin.organizationId) {
          console.log(`  Organization: ${admin.organizationId.name} (${admin.organizationId.code})`);
        } else {
          console.log(`  ⚠️  Organization ID: ${admin.organizationId} (NOT FOUND IN DB)`);
          
          // Try to find the raw organizationId
          const rawAdmin = await Admin.findById(admin._id).select('organizationId');
          console.log(`  Raw Organization ID in admin record: ${rawAdmin.organizationId}`);
        }
      }
    }

    // Check scholars
    console.log('\n🎓 SCHOLARS:');
    const scholarCount = await Scholar.countDocuments();
    console.log(`Total scholars: ${scholarCount}`);

    // Check for orphaned admins (admins without valid organizations)
    console.log('\n⚠️  CHECKING FOR ORPHANED ADMINS:');
    const orphanedAdmins = await Admin.find({}).select('_id personalInfo.email organizationId');
    for (const admin of orphanedAdmins) {
      const org = await Organization.findById(admin.organizationId);
      if (!org) {
        console.log(`❌ Admin ${admin.personalInfo.email} (${admin._id}) has invalid organizationId: ${admin.organizationId}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkDatabase();