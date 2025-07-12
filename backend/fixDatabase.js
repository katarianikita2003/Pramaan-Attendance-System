// fixDatabase.js - Save this in your backend folder (ESM version)
import mongoose from 'mongoose';
import process from 'process';

async function fixDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/test');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check if 'scholars' collection exists
    const collections = await db.listCollections().toArray();
    const hasScholars = collections.some(col => col.name === 'scholars');

    if (!hasScholars) {
      console.log('\n⚠️ Collection "scholars" does not exist. Please insert at least one document first.');
      await mongoose.disconnect();
      process.exit(1);
    }

    const collection = db.collection('scholars');

    // List all indexes
    console.log('\n📂 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Try to drop the problematic index
    try {
      await collection.dropIndex('biometricData.did_1');
      console.log('\n✅ Successfully dropped biometricData.did_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️ Index biometricData.did_1 does not exist (already removed)');
      } else {
        console.log('\n❌ Error dropping index:', error.message);
      }
    }

    // List indexes again to confirm
    console.log('\n🔍 Indexes after cleanup:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Optional: Clear data
    const shouldClearData = process.argv.includes('--clear');
    if (shouldClearData) {
      await collection.deleteMany({});
      console.log('\n🧹 Cleared all scholars data');
    }

    console.log('\n✅ Database fix completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixDatabase();
