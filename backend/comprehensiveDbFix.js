// backend/comprehensiveDbFix.js
// This will completely drop and recreate the scholars collection

import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(col => console.log(`- ${col.name}`));
    
    // Drop the scholars collection completely
    try {
      await db.dropCollection('scholars');
      console.log('\n✅ Dropped scholars collection');
    } catch (error) {
      console.log('\n⚠️ Scholars collection not found or could not be dropped:', error.message);
    }
    
    // Also check for any other collections that might have the wrong schema
    const collectionNames = collections.map(c => c.name);
    for (const name of collectionNames) {
      if (name.includes('scholar')) {
        console.log(`\nChecking collection: ${name}`);
        const collection = db.collection(name);
        const indexes = await collection.indexes();
        
        const hasBadIndex = indexes.some(idx => 
          idx.key && idx.key['biometricData.did'] === 1
        );
        
        if (hasBadIndex) {
          console.log(`Found bad index in ${name}, dropping collection...`);
          await db.dropCollection(name);
          console.log(`✅ Dropped ${name}`);
        }
      }
    }
    
    console.log('\n✅ Database cleanup complete!');
    console.log('\n⚠️ IMPORTANT: Restart your backend server now to recreate collections with correct schema');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}).catch(err => {
  console.error('Connection error:', err);
});