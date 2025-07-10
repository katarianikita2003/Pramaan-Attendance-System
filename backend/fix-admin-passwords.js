const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixAdminPasswords() {
  await mongoose.connect('mongodb://localhost:27017/pramaan_zkp_attendance');
  
  const Admin = mongoose.model('Admin', {
    email: String,
    password: String,
    passwordHash: String,
    name: String,
    organizationId: mongoose.Schema.Types.ObjectId
  });

  // Fix all admins
  const admins = await Admin.find({});
  
  for (const admin of admins) {
    if (!admin.password && admin.passwordHash) {
      // Move passwordHash to password
      admin.password = admin.passwordHash;
      admin.passwordHash = undefined;
      await admin.save();
      console.log(`Fixed admin: ${admin.email}`);
    } else if (!admin.password) {
      // Set default password
      const defaultPasswords = {
        'admin1@gmail.com': 'Admin111',
        'admin2@gmail.com': 'Admin222',
        'admin3@gmail.com': 'Admin333',
        'admin4@gmail.com': 'Admin444',
        'admin5@gmail.com': 'Admin555',
        'admin6@gmail.com': 'Admin666',
        'admin7@gmail.com': 'Admin777',
        'admin8@gmail.com': 'Admin888',
        'admin9@gmail.com': 'Admin999',
        'admin10@gmail.com': 'Admin101010'
      };
      
      const plainPassword = defaultPasswords[admin.email] || 'Admin123';
      admin.password = await bcrypt.hash(plainPassword, 10);
      await admin.save();
      console.log(`Set password for admin: ${admin.email} (password: ${plainPassword})`);
    }
  }
  
  console.log('All admins fixed!');
  process.exit(0);
}

fixAdminPasswords();