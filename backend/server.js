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
import rateLimit from 'express-rate-limit';

// Import configurations
import { connectDatabase } from './src/config/database.js';
import { corsOptions } from './src/config/constants.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import organizationRoutes from './src/routes/organization.routes.js';
import scholarRoutes from './src/routes/scholar.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import zkpRoutes from './src/routes/zkp.routes.js';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

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

// Enhanced CORS configuration for Expo
const enhancedCorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:8081',
      'http://localhost:19000',
      'http://localhost:19001',
      'http://localhost:19002',
      'http://10.179.83.32:8081',
      'http://10.179.83.32:19000',
      'exp://10.179.83.32:8081',
      /^exp:\/\/\d+\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/
    ];
    
    // Allow requests with no origin (mobile apps)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(enhancedCorsOptions));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(requestLogger);

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));
app.use('/api/admin', adminRoutes);

// Request logging for debugging
app.use((req, res, next) => {
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    origin: req.get('origin'),
    body: req.method === 'POST' ? req.body : undefined
  });
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      type: 'response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    zkpStatus: zkpService.isInitialized ? 'ready' : 'initializing',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API version endpoint
app.get('/api', (req, res) => {
  res.json({
    version: '2.0.0',
    name: 'Pramaan Backend API',
    description: 'Zero-Knowledge Proof Attendance System',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      scholar: '/api/scholar',
      attendance: '/api/attendance',
      organization: '/api/organization',
      zkp: '/api/zkp'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/organizations', organizationRoutes); // Alternative path
app.use('/api/scholar', scholarRoutes);
app.use('/api/scholars', scholarRoutes); // Alternative path
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/zkp', zkpRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Initialize server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Initialize ZKP service
    await zkpService.initialize();
    logger.info('✅ ZKP Service initialized');

    // Start server - listen on all interfaces
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Pramaan Backend Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔐 ZKP Status: ${zkpService.isInitialized ? 'Active' : 'Simulation Mode'}`);
      logger.info(`🌐 Server accessible at: http://0.0.0.0:${PORT}`);
      logger.info(`📡 Local IP: http://10.179.83.32:${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
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

// Export app for testing
export default app;

// Start the server
startServer();