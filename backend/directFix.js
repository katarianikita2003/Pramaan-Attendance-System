// directFix.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function directFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    console.log('\n=== Creating Known Good Password Hashes ===');
    
    // These are pre-verified hashes
    const hashes = {
      'Admin111': await bcrypt.hash('Admin111', 10),
      'admin123': await bcrypt.hash('admin123', 10),
      'scholar123': await bcrypt.hash('scholar123', 10)
    };
    
    // Verify our hashes are good
    console.log('Verifying hashes...');
    console.log('Admin111 hash valid:', await bcrypt.compare('Admin111', hashes['Admin111']));
    console.log('admin123 hash valid:', await bcrypt.compare('admin123', hashes['admin123']));
    console.log('scholar123 hash valid:', await bcrypt.compare('scholar123', hashes['scholar123']));
    
    console.log('\n=== Updating Database Directly ===');
    
    // Update admins collection directly
    const adminsCollection = db.collection('admins');
    
    const result1 = await adminsCollection.updateOne(
      { 'personalInfo.email': 'admin1@gmail.com' },
      { $set: { 'credentials.passwordHash': hashes['Admin111'] } }
    );
    console.log('Updated admin1@gmail.com:', result1.modifiedCount, 'document(s)');
    
    const result2 = await adminsCollection.updateOne(
      { 'personalInfo.email': 'admin@demo.com' },
      { $set: { 'credentials.passwordHash': hashes['admin123'] } }
    );
    console.log('Updated admin@demo.com:', result2.modifiedCount, 'document(s)');
    
    // Update scholars collection directly
    const scholarsCollection = db.collection('scholars');
    
    const result3 = await scholarsCollection.updateOne(
      { 'personalInfo.email': 'john@demo.com' },
      { $set: { 'credentials.passwordHash': hashes['scholar123'] } }
    );
    console.log('Updated john@demo.com:', result3.modifiedCount, 'document(s)');
    
    console.log('\n=== Verifying Updates ===');
    
    // Verify directly from database
    const admin1 = await adminsCollection.findOne({ 'personalInfo.email': 'admin1@gmail.com' });
    const admin2 = await adminsCollection.findOne({ 'personalInfo.email': 'admin@demo.com' });
    const scholar = await scholarsCollection.findOne({ 'personalInfo.email': 'john@demo.com' });
    
    if (admin1) {
      const test1 = await bcrypt.compare('Admin111', admin1.credentials.passwordHash);
      console.log('admin1@gmail.com password "Admin111" works:', test1);
    }
    
    if (admin2) {
      const test2 = await bcrypt.compare('admin123', admin2.credentials.passwordHash);
      console.log('admin@demo.com password "admin123" works:', test2);
    }
    
    if (scholar) {
      const test3 = await bcrypt.compare('scholar123', scholar.credentials.passwordHash);
      console.log('john@demo.com password "scholar123" works:', test3);
    }
    
    console.log('\n✅ Direct database update complete!');
    console.log('\nYou should now be able to login with:');
    console.log('- Admin: admin1@gmail.com / Admin111');
    console.log('- Admin: admin@demo.com / admin123');
    console.log('- Scholar: john@demo.com / scholar123 (org code: DEMO123)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

directFix();