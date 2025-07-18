// backend/scripts/createIndexes.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Create indexes
    console.log('Creating indexes...');

    // Helper function to create index safely
    async function createIndexSafe(collection, index, options = {}) {
      try {
        await db.collection(collection).createIndex(index, options);
        return true;
      } catch (error) {
        if (error.code === 86) {
          console.log(`  Index already exists on ${collection}:`, Object.keys(index).join(', '));
          return true;
        }
        throw error;
      }
    }

    // Scholars indexes
    await createIndexSafe('scholars', { scholarId: 1, organizationId: 1 }, { unique: true });
    await createIndexSafe('scholars', { 'personalInfo.email': 1 });
    console.log('✓ Scholar indexes created');

    // Global biometric registry indexes
    await createIndexSafe('globalbiometricregistries', { commitmentHash: 1, biometricType: 1 }, { unique: true });
    await createIndexSafe('globalbiometricregistries', { nullifier: 1 }, { unique: true });
    console.log('✓ Global biometric registry indexes created');

    // Attendance indexes
    await createIndexSafe('attendances', { scholarId: 1, date: -1 });
    await createIndexSafe('attendances', { 'proofData.zkProof.proofId': 1 });
    console.log('✓ Attendance indexes created');

    // BiometricCommitment indexes
    await createIndexSafe('biometriccommitments', { 'commitments.face.hash': 1 }, { sparse: true });
    await createIndexSafe('biometriccommitments', { 'commitments.fingerprint.hash': 1 }, { sparse: true });
    console.log('✓ BiometricCommitment indexes created');

    console.log('\nAll indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();