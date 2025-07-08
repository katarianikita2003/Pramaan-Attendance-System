import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test creating a collection
    const testCollection = mongoose.connection.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Successfully wrote to database!');
    
    // Clean up
    await testCollection.deleteOne({ test: true });
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();