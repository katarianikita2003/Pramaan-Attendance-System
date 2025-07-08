import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

// Your MongoDB URI will be automatically loaded from the environment
const MONGODB_URI = process.env.MONGODB_URI;

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // ... rest of the seed logic
  } catch (error) {
    console.error('Seed error:', error);
  }
}