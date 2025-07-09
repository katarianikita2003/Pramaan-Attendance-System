// backend/fixAdminPasswords.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './src/models/Admin.js';

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

async function fixAdminPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all admins
    const admins = await Admin.find({})
      .select('+credentials.password +credentials.passwordHash');

    console.log(`\n📋 Found ${admins.length} admins`);

    for (const admin of admins) {
      console.log(`\nChecking admin: ${admin.personalInfo.email}`);
      
      // Check if password needs to be moved from passwordHash to password
      if (admin.credentials.passwordHash && !admin.credentials.password) {
        console.log('  - Moving passwordHash to password field');
        admin.credentials.password = admin.credentials.passwordHash;
        admin.credentials.passwordHash = undefined;
        await admin.save();
        console.log('  ✅ Fixed password field');
      } else if (admin.credentials.password) {
        console.log('  ✅ Password field already correct');
      } else {
        console.log('  ⚠️  No password found - setting default');
        // Set a default password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        admin.credentials.password = hashedPassword;
        await admin.save();
        console.log('  ✅ Set default password: admin123');
      }
    }

    console.log('\n✅ All admins fixed!');
    
    // Test login for demo admin
    const demoAdmin = await Admin.findOne({ 'personalInfo.email': 'admin@demo.com' })
      .select('+credentials.password');
    
    if (demoAdmin) {
      const testPassword = await bcrypt.compare('admin123', demoAdmin.credentials.password);
      console.log(`\n🔐 Test login for admin@demo.com: ${testPassword ? '✅ Success' : '❌ Failed'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
  }
}

fixAdminPasswords();