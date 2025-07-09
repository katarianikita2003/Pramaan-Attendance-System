// backend/fixAdminPasswordsDirect.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

async function fixAdminPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the Admin collection directly
    const adminCollection = mongoose.connection.collection('admins');

    // Find all admins
    const admins = await adminCollection.find({}).toArray();
    console.log(`\n📋 Found ${admins.length} admins`);

    for (const admin of admins) {
      console.log(`\nChecking admin: ${admin.personalInfo.email}`);
      
      if (admin.credentials.passwordHash && !admin.credentials.password) {
        // Move passwordHash to password field
        console.log('  - Moving passwordHash to password field');
        
        await adminCollection.updateOne(
          { _id: admin._id },
          {
            $set: { 'credentials.password': admin.credentials.passwordHash },
            $unset: { 'credentials.passwordHash': 1 }
          }
        );
        
        console.log('  ✅ Fixed password field');
      } else if (admin.credentials.password) {
        console.log('  ✅ Password field already correct');
      } else if (!admin.credentials.password && !admin.credentials.passwordHash) {
        // No password at all - set default
        console.log('  ⚠️  No password found - setting default');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await adminCollection.updateOne(
          { _id: admin._id },
          { $set: { 'credentials.password': hashedPassword } }
        );
        
        console.log('  ✅ Set default password: admin123');
      }
    }

    console.log('\n✅ All admins fixed!');
    
    // Test the fix
    const testAdmin = await adminCollection.findOne({ 'personalInfo.email': 'admin@demo.com' });
    if (testAdmin) {
      console.log('\n🔐 Test admin@demo.com:');
      console.log('  - Has password field:', !!testAdmin.credentials.password);
      console.log('  - Has passwordHash field:', !!testAdmin.credentials.passwordHash);
      
      if (testAdmin.credentials.password) {
        const testResult = await bcrypt.compare('admin123', testAdmin.credentials.password);
        console.log('  - Password test (admin123):', testResult ? '✅ Success' : '❌ Failed');
      }
    }

    // Show all admin emails and their password status
    console.log('\n📋 Admin Summary:');
    const updatedAdmins = await adminCollection.find({}).toArray();
    for (const admin of updatedAdmins) {
      console.log(`  - ${admin.personalInfo.email}: ${admin.credentials.password ? '✅ Has password' : '❌ No password'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
  }
}

fixAdminPasswords();