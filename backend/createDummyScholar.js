// createDummyScholar.js - ESM version
import mongoose from 'mongoose';

const scholarSchema = new mongoose.Schema({
  name: String,
  email: String,
  rollNumber: String,
  biometricData: {
    did: String
  }
});

const Scholar = mongoose.model('Scholar', scholarSchema);

async function createDummyScholar() {
  try {
    await mongoose.connect('mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');

    const dummy = new Scholar({
      name: 'Dummy Scholar',
      email: 'dummy@example.com',
      rollNumber: 'DUMMY001',
      biometricData: {
        did: 'dummy-did-123'
      }
    });

    await dummy.save();
    console.log('🎉 Dummy scholar created successfully');
  } catch (err) {
    console.error('❌ Error inserting dummy scholar:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createDummyScholar();
