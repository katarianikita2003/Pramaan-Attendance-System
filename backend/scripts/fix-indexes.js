// backend/scripts/fix-indexes.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
  try {
    // Connect to MongoDB (without deprecated options)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan');

    console.log('Connected to MongoDB');

    // Get the biometriccommitments collection
    const db = mongoose.connection.db;
    const collection = db.collection('biometriccommitments');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop problematic indexes
    const indexesToDrop = [
      'scholarId_1', 
      'scholarId_1_status_1', 
      'commitment_1', 
      'nullifier_1',
      'commitments.combined.hash_1',  // Add this line
      'zkpParams.nullifier_1'          // Add this line
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✓ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`- Index ${indexName} not found (already removed)`);
        } else {
          console.log(`✗ Error dropping ${indexName}:`, error.message);
        }
      }
    }

    // Create or verify required indexes
    const requiredIndexes = [
      { key: { userId: 1 }, name: 'userId_1' },
      { key: { organizationId: 1 }, name: 'organizationId_1' },
      { key: { 'commitments.face.hash': 1 }, name: 'commitments.face.hash_1', sparse: true },
      { key: { 'commitments.fingerprint.hash': 1 }, name: 'commitments.fingerprint.hash_1', sparse: true }
    ];

    for (const index of requiredIndexes) {
      const existingIndex = indexes.find(idx => idx.name === index.name);
      if (existingIndex) {
        console.log(`✓ Index ${index.name} already exists`);
      } else {
        try {
          await collection.createIndex(index.key, { 
            name: index.name, 
            sparse: index.sparse || false 
          });
          console.log(`✓ Created index: ${index.name}`);
        } catch (error) {
          console.log(`- Skipping ${index.name}: ${error.message}`);
        }
      }
    }

    console.log('\nIndexes fixed successfully!');

    // List updated indexes
    const updatedIndexes = await collection.indexes();
    console.log('\nFinal indexes:', updatedIndexes.map(idx => idx.name));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndexes();