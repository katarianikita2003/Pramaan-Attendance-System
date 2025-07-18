// backend/server.js - Main server file
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import os from 'os';

// Import configurations
import { connectDatabase } from './src/config/database.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import organizationRoutes from './src/routes/organization.routes.js';
import scholarRoutes from './src/routes/scholar.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import biometricRoutes from './src/routes/biometric.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import zkpRoutes from './src/routes/zkp.routes.js';

// Import middleware
import { errorHandler } from './src/middleware/error.middleware.js';
import { requestLogger } from './src/middleware/logger.middleware.js';

// Import services
import zkpService from './src/services/zkp.service.js';
import logger from './src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Enhanced CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against whitelist
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8081',
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+$/,
      /^exp:\/\/\d+\.\d+\.\d+$/
    ];
    
    const allowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(requestLogger);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Pramaan Backend',
    zkpMode: zkpService.mode,
    zkpInitialized: zkpService.isInitialized,
    zkpStatus: zkpService.getStatus(),
    version: '2.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/scholar', scholarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/zkp', zkpRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Pramaan API Server', 
    version: '2.0.0',
    features: {
      zkp: true,
      zkpMode: zkpService.mode,
      qrCode: true,
      biometric: true,
      multiTenant: true
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    path: req.path 
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('MongoDB connected successfully');
    
    // Initialize ZKP Service
    await zkpService.initialize();
    logger.info(`ZKP Service initialized in ${zkpService.mode} mode`);
    
    // Log ZKP status
    const zkpStatus = zkpService.getStatus();
    logger.info('ZKP Status:', zkpStatus);
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`ZKP Mode: ${zkpService.mode}`);
      logger.info(`ZKP Real Circuits: ${zkpService.isRealZKP ? 'Yes' : 'No'}`);
      logger.info('ZKP-based attendance system is active');
      
      // Log all available IPs
      const networkInterfaces = os.networkInterfaces();
      Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
          if (iface.family === 'IPv4' && !iface.internal) {
            logger.info(`Available at: http://${iface.address}:${PORT}`);
          }
        });
      });
    });
    
    // Initialize ZKP Service after server starts (backup initialization)
    setTimeout(async () => {
      if (!zkpService.isInitialized) {
        await zkpService.initialize();
        logger.info(`ZKP Service initialized (delayed) in ${zkpService.mode} mode`);
      }
    }, 1000);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});