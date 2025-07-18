// backend/src/scripts/fix-existing-enrollments.js
import mongoose from 'mongoose';
import crypto from 'crypto';
import BiometricCommitment from '../models/BiometricCommitment.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixExistingEnrollments() {
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

    let fixed = 0;

    for (const commitment of commitments) {
      let needsUpdate = false;

      // Fix userType if it's lowercase
      if (commitment.userType === 'scholar') {
        commitment.userType = 'Scholar';
        needsUpdate = true;
        console.log(`Fixed userType for commitment ${commitment._id}`);
      }

      // Check and fix face commitment
      if (commitment.commitments?.face) {
        if (!commitment.commitments.face.salt) {
          const salt = crypto.randomBytes(32).toString('hex');
          
          // Parse existing commitment if possible
          let template = commitment.commitments.face.commitment;
          if (typeof template === 'string') {
            try {
              const parsed = JSON.parse(template);
              if (!parsed.salt) {
                parsed.salt = salt;
                commitment.commitments.face.commitment = JSON.stringify(parsed);
              } else {
                commitment.commitments.face.salt = parsed.salt;
              }
            } catch (e) {
              // If not JSON, create new structure
              commitment.commitments.face.commitment = JSON.stringify({
                template: template,
                salt: salt,
                timestamp: commitment.commitments.face.timestamp || Date.now()
              });
            }
          }
          
          if (!commitment.commitments.face.salt) {
            commitment.commitments.face.salt = salt;
          }
          
          // Regenerate hash with salt
          const hash = crypto.createHash('sha256')
            .update(commitment.commitments.face.commitment)
            .digest('hex');
          commitment.commitments.face.hash = hash;
          
          needsUpdate = true;
          console.log(`Added salt to face commitment for user ${commitment.userId}`);
        }
      }

      // Check and fix fingerprint commitment
      if (commitment.commitments?.fingerprint) {
        if (!commitment.commitments.fingerprint.salt) {
          const salt = crypto.randomBytes(32).toString('hex');
          
          // Parse existing commitment if possible
          let template = commitment.commitments.fingerprint.commitment;
          if (typeof template === 'string') {
            try {
              const parsed = JSON.parse(template);
              if (!parsed.salt) {
                parsed.salt = salt;
                commitment.commitments.fingerprint.commitment = JSON.stringify(parsed);
              } else {
                commitment.commitments.fingerprint.salt = parsed.salt;
              }
            } catch (e) {
              // If not JSON, create new structure
              commitment.commitments.fingerprint.commitment = JSON.stringify({
                template: template,
                salt: salt,
                timestamp: commitment.commitments.fingerprint.timestamp || Date.now()
              });
            }
          }
          
          if (!commitment.commitments.fingerprint.salt) {
            commitment.commitments.fingerprint.salt = salt;
          }
          
          // Regenerate hash with salt
          const hash = crypto.createHash('sha256')
            .update(commitment.commitments.fingerprint.commitment)
            .digest('hex');
          commitment.commitments.fingerprint.hash = hash;
          
          needsUpdate = true;
          console.log(`Added salt to fingerprint commitment for user ${commitment.userId}`);
        }
      }

      if (needsUpdate) {
        // Remove validation for the update
        await commitment.save({ validateBeforeSave: false });
        fixed++;
      }
    }

    console.log(`\nFixed ${fixed} biometric commitments.`);
    
    // Display summary
    const updatedCommitments = await BiometricCommitment.find({});
    console.log('\nSummary:');
    console.log(`Total commitments: ${updatedCommitments.length}`);
    
    let validCount = 0;
    for (const c of updatedCommitments) {
      const hasValidFingerprint = c.commitments?.fingerprint?.salt && c.commitments?.fingerprint?.hash;
      const hasValidFace = c.commitments?.face?.salt && c.commitments?.face?.hash;
      if ((hasValidFingerprint || hasValidFace) && c.userType === 'Scholar') {
        validCount++;
      }
    }
    console.log(`Valid commitments: ${validCount}`);
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Fix enrollments error:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  fixExistingEnrollments();
}

export default fixExistingEnrollments;