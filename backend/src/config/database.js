// backend/src/config/database.js
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDatabase = async () => {
  try {
    // Remove deprecated options for Mongoose 6+
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan';
    
    await mongoose.connect(uri, options);
    
    logger.info('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
};

export default { connectDatabase };