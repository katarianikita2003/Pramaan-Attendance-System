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
import { corsOptions } from './src/config/constants.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import organizationRoutes from './src/routes/organization.routes.js';
import scholarRoutes from './src/routes/scholar.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import adminRoutes from './src/routes/admin.routes.js';

// Import middleware
import { errorHandler } from './src/middleware/error.middleware.js';
import { requestLogger } from './src/middleware/logger.middleware.js';

// Import services
import { ZKPService } from './src/services/zkp.service.js';
import logger from './src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize services
const zkpService = new ZKPService();

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
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(requestLogger);

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    zkpStatus: zkpService.isInitialized ? 'ready' : 'initializing'
  });
});

// API Routes - Using singular forms to match mobile app
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);  // Changed from /api/organizations
app.use('/api/scholar', scholarRoutes);            // Changed from /api/scholars
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// Initialize server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Initialize ZKP service
    await zkpService.initialize();
    logger.info('✅ ZKP Service initialized');

    // Start server - bind to all network interfaces
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Pramaan Backend Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔐 ZKP Status: ${zkpService.isInitialized ? 'Active' : 'Simulation Mode'}`);
      logger.info(`🌐 Server accessible at: http://0.0.0.0:${PORT}`);
      
      // Get network interfaces
      const networkInterfaces = os.networkInterfaces();
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            logger.info(`📡 Local IP: http://${iface.address}:${PORT}`);
          }
        });
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        throw error;
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();