// ===== backend/src/config/database.js =====
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDatabase = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    if (process.env.NODE_ENV === 'production') {
      options.ssl = true;
      options.sslValidate = true;
      options.authSource = 'admin';
    }

    await mongoose.connect(process.env.MONGODB_URI, options);

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Create indexes
    await createIndexes();

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    // Organization indexes
    await mongoose.connection.collection('organizations').createIndex(
      { code: 1 }, 
      { unique: true }
    );

    // Scholar indexes
    await mongoose.connection.collection('scholars').createIndex(
      { organizationId: 1, scholarId: 1 }, 
      { unique: true }
    );
    await mongoose.connection.collection('scholars').createIndex(
      { globalBiometricHash: 1 }, 
      { unique: true, sparse: true }
    );

    // Attendance proof indexes
    await mongoose.connection.collection('attendanceproofs').createIndex(
      { organizationId: 1, timestamp: -1 }
    );
    await mongoose.connection.collection('attendanceproofs').createIndex(
      { 'zkProof.proofHash': 1 }, 
      { unique: true }
    );

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
};