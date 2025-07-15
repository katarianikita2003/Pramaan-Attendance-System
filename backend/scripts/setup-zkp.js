// backend/scripts/setup-zkp.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../src/models/Organization.js';
import enhancedZKPService from '../src/services/zkp.service.enhanced.js';
import logger from '../src/utils/logger.js';

dotenv.config();

async function setupZKPForOrganizations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    await enhancedZKPService.initialize();
    logger.info('ZKP Service initialized');

    const organizations = await Organization.find({
      $or: [
        { zkpKeys: { $exists: false } },
        { 'zkpKeys.verificationKey': { $exists: false } }
      ]
    });

    logger.info(`Found ${organizations.length} organizations without ZKP keys`);

    let successCount = 0;
    let errorCount = 0;

    for (const org of organizations) {
      try {
        logger.info(`Generating ZKP keys for: ${org.name}`);
        
        const keys = await enhancedZKPService.generateKeys(org._id.toString());
        
        // Fix missing contact information if needed
        if (!org.contact || !org.contact.email || !org.contact.phone || !org.contact.address) {
          org.contact = {
            email: org.contact?.email || 'admin@' + org.code + '.com',
            phone: org.contact?.phone || '+1234567890',
            address: org.contact?.address || 'Not specified'
          };
        }
        
        org.zkpKeys = {
          verificationKey: keys.verificationKey,
          keyVersion: 1,
          generatedAt: new Date()
        };
        
        await org.save();
        logger.info(`✓ ZKP keys generated for ${org.name}`);
        successCount++;
      } catch (error) {
        logger.error(`Failed to process ${org.name}:`, error.message);
        errorCount++;
      }
    }

    logger.info(`ZKP setup completed. Success: ${successCount}, Errors: ${errorCount}`);
    process.exit(0);
  } catch (error) {
    logger.error('ZKP setup failed:', error);
    process.exit(1);
  }
}

setupZKPForOrganizations();