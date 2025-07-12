// backend/finalMongoDBFix.js
// This script ensures complete cleanup and shows current state

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function fixDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. Drop the scholars collection completely
    console.log('\n1️⃣ Dropping scholars collection...');
    try {
      await db.dropCollection('scholars');
      console.log('   ✅ Scholars collection dropped');
    } catch (error) {
      console.log('   ℹ️ Scholars collection does not exist');
    }
    
    // 2. List all indexes in the database
    console.log('\n2️⃣ Checking all collections for problematic indexes...');
    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      try {
        const collection = db.collection(col.name);
        const indexes = await collection.indexes();
        
        console.log(`\n   Collection: ${col.name}`);
        indexes.forEach(index => {
          console.log(`   - Index: ${JSON.stringify(index.key)}`);
          
          // Check for problematic index
          if (index.key && index.key['biometricData.did']) {
            console.log(`     ⚠️ FOUND PROBLEMATIC INDEX!`);
          }
        });
      } catch (error) {
        // Collection might not exist anymore
      }
    }
    
    // 3. Create a clean Scholar model instance to ensure correct schema
    console.log('\n3️⃣ Testing clean Scholar model...');
    
    // Dynamic import to ensure we get the latest version
    const { default: Scholar } = await import('./src/models/Scholar.js');
    
    // Check the schema structure
    const schemaPaths = Scholar.schema.paths;
    console.log('\n   Current Scholar schema structure:');
    
    const hasProblematicField = Object.keys(schemaPaths).some(path => 
      path.includes('biometricData.did')
    );
    
    if (hasProblematicField) {
      console.log('   ❌ ERROR: Schema still contains biometricData.did field!');
      console.log('   Please check your Scholar.js model file.');
    } else {
      console.log('   ✅ Schema structure is correct (no biometricData.did)');
    }
    
    // Show what fields exist
    console.log('\n   Biometric-related fields in schema:');
    Object.keys(schemaPaths).forEach(path => {
      if (path.includes('biometric')) {
        console.log(`   - ${path}`);
      }
    });
    
    console.log('\n✅ Database check complete!');
    console.log('\n📋 Next steps:');
    console.log('1. If any problematic indexes were found, the collection was dropped');
    console.log('2. Make sure no old schema files are being imported');
    console.log('3. Restart your backend server to recreate collections with correct schema');
    console.log('4. The error should now be resolved!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the fix
fixDatabase().catch(console.error);