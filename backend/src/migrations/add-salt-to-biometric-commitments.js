// backend/src/migrations/add-salt-to-biometric-commitments.js
import mongoose from 'mongoose';
import crypto from 'crypto';
import BiometricCommitment from '../models/BiometricCommitment.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateBiometricCommitments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan-zkp', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Find all biometric commitments
    const commitments = await BiometricCommitment.find({});
    console.log(`Found ${commitments.length} biometric commitments to check`);

    let updated = 0;

    for (const commitment of commitments) {
      let needsUpdate = false;

      // Check and update face commitment
      if (commitment.commitments?.face && !commitment.commitments.face.salt) {
        const salt = crypto.randomBytes(32).toString('hex');
        commitment.commitments.face.salt = salt;
        
        // If commitment is a string, try to parse it and add salt
        if (typeof commitment.commitments.face.commitment === 'string') {
          try {
            const data = JSON.parse(commitment.commitments.face.commitment);
            data.salt = salt;
            commitment.commitments.face.commitment = JSON.stringify(data);
          } catch (e) {
            // If not JSON, create new structure
            commitment.commitments.face.commitment = JSON.stringify({
              template: commitment.commitments.face.commitment,
              salt: salt,
              timestamp: commitment.commitments.face.timestamp || Date.now()
            });
          }
        }
        needsUpdate = true;
      }

      // Check and update fingerprint commitment
      if (commitment.commitments?.fingerprint && !commitment.commitments.fingerprint.salt) {
        const salt = crypto.randomBytes(32).toString('hex');
        commitment.commitments.fingerprint.salt = salt;
        
        // If commitment is a string, try to parse it and add salt
        if (typeof commitment.commitments.fingerprint.commitment === 'string') {
          try {
            const data = JSON.parse(commitment.commitments.fingerprint.commitment);
            data.salt = salt;
            commitment.commitments.fingerprint.commitment = JSON.stringify(data);
          } catch (e) {
            // If not JSON, create new structure
            commitment.commitments.fingerprint.commitment = JSON.stringify({
              template: commitment.commitments.fingerprint.commitment,
              salt: salt,
              timestamp: commitment.commitments.fingerprint.timestamp || Date.now()
            });
          }
        }
        needsUpdate = true;
      }

      if (needsUpdate) {
        await commitment.save();
        updated++;
        console.log(`Updated commitment for user ${commitment.userId}`);
      }
    }

    console.log(`Migration complete. Updated ${updated} biometric commitments.`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrateBiometricCommitments();
}

export default migrateBiometricCommitments;