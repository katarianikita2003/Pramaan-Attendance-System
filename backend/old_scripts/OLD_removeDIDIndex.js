// backend/removeDIDIndex.js
// Run this script to remove the problematic index

import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('scholars');
    
    // List current indexes
    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Try to drop the problematic index
    try {
      await collection.dropIndex('biometricData.did_1');
      console.log('\n✅ Dropped biometricData.did_1 index');
    } catch (error) {
      console.log('\n⚠️ Index biometricData.did_1 not found or already removed');
    }
    
    // The correct schema uses 'biometrics' not 'biometricData'
    // So this index shouldn't exist anyway
    
    console.log('\n✅ Database is ready for ZKP-based scholar registration!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}).catch(err => {
  console.error('Connection error:', err);
});