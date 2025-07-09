import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan').then(async () => {
  const Organization = (await import('../models/Organization.js')).default;
  const Admin = (await import('../models/Admin.js')).default;
  const Scholar = (await import('../models/Scholar.js')).default;
  
  const orgs = await Organization.find();
  const admins = await Admin.find();
  const scholars = await Scholar.find();
  
  console.log('Organizations:', orgs.length);
  console.log('Admins:', admins.length);
  console.log('Scholars:', scholars.length);
  
  if (orgs.length > 0) {
    console.log('\nOrganization codes:');
    orgs.forEach(org => console.log(`- ${org.name}: ${org.code}`));
  }
  
  if (admins.length > 0) {
    console.log('\nAdmin emails:');
    admins.forEach(admin => console.log(`- ${admin.personalInfo.email}`));
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});