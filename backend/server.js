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
import adminRoutes from './src/routes/admin.routes.js';
import biometricRoutes from './src/routes/biometric.routes.js';


// Import the ENHANCED attendance routes for ZKP
import attendanceRoutes from './src/routes/attendance.routes.js';

// Import middleware
import { errorHandler } from './src/middleware/error.middleware.js';
import { requestLogger } from './src/middleware/logger.middleware.js';

// Import services
import { zkpService } from './src/services/zkp.service.js';
import enhancedZKPService from './src/services/zkp.service.enhanced.js';
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

// Initialize Enhanced ZKP Service
// enhancedZKPService.initialize().then(() => {
//   logger.info('Enhanced ZKP Service initialized');
// }).catch(err => {
//   logger.error('Failed to initialize Enhanced ZKP Service:', err);
// });

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
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^exp:\/\/\d+\.\d+\.\d+\.\d+:\d+$/
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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Pramaan Backend',
    zkpEnabled: true,
    version: '2.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/scholar', scholarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/attendance', attendanceRoutes); // Now using enhanced routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Pramaan API Server', 
    version: '2.0.0',
    features: {
      zkp: true,
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
    await connectDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
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

// // backend/server.js - Main server file
// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import compression from 'compression';
// import { fileURLToPath } from 'url';
// import path from 'path';
// import dotenv from 'dotenv';
// import os from 'os';

// // Import configurations
// import { connectDatabase } from './src/config/database.js';
// import { corsOptions } from './src/config/constants.js';

// // Import routes
// import authRoutes from './src/routes/auth.routes.js';
// import organizationRoutes from './src/routes/organization.routes.js';
// import scholarRoutes from './src/routes/scholar.routes.js';
// import attendanceRoutes from './src/routes/attendance.routes.js';
// import adminRoutes from './src/routes/admin.routes.js';
// import biometricRoutes from './src/routes/biometric.routes.js'; // ADDED THIS LINE

// // Import middleware
// import { errorHandler } from './src/middleware/error.middleware.js';
// import { requestLogger } from './src/middleware/logger.middleware.js';

// // Import services - Updated to import the singleton instance
// import { zkpService } from './src/services/zkp.service.js';
// import logger from './src/utils/logger.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Load environment variables
// dotenv.config({
//   path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
// });

// // Initialize express app
// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'", "'unsafe-inline'"],
//       imgSrc: ["'self'", "data:", "blob:"],
//       connectSrc: ["'self'"],
//     },
//   },
// }));

// // Enhanced CORS configuration
// app.use(cors({
//   origin: function(origin, callback) {
//     // Allow requests with no origin (like mobile apps)
//     if (!origin) return callback(null, true);
    
//     // Allow all origins in development
//     if (process.env.NODE_ENV === 'development') {
//       return callback(null, true);
//     }
    
//     // In production, check against whitelist
//     const allowedOrigins = [
//       'http://localhost:3000',
//       'http://localhost:8081',
//       /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
//       /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
//       /^exp:\/\/\d+\.\d+\.\d+\.\d+:\d+$/
//     ];
    
//     const allowed = allowedOrigins.some(allowed => {
//       if (allowed instanceof RegExp) {
//         return allowed.test(origin);
//       }
//       return allowed === origin;
//     });
    
//     callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//   exposedHeaders: ['X-Auth-Token']
// }));

// app.use(compression());

// // Body parsing middleware with enhanced error handling
// app.use(express.json({ 
//   limit: '50mb',
//   verify: (req, res, buf, encoding) => {
//     try {
//       JSON.parse(buf.toString());
//     } catch (e) {
//       // Check if it's double-stringified JSON
//       const str = buf.toString();
//       if (str.startsWith('"') && str.endsWith('"')) {
//         try {
//           // Remove outer quotes and parse
//           const unescaped = JSON.parse(str);
//           req.body = JSON.parse(unescaped);
//           req._body = true; // Mark that body has been parsed
//           return;
//         } catch (innerError) {
//           // Fall through to error
//         }
//       }
      
//       logger.error('Invalid JSON in request body:', e.message);
//       throw new SyntaxError('Invalid JSON');
//     }
//   }
// }));

// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Logging middleware
// app.use(morgan('combined', { 
//   stream: { 
//     write: message => logger.info(message.trim()) 
//   },
//   skip: (req, res) => req.url === '/health' // Skip health check logs
// }));

// app.use(requestLogger);

// // Fix for double-stringified JSON (additional safety layer)
// app.use((req, res, next) => {
//   if (req.body && typeof req.body === 'string') {
//     try {
//       req.body = JSON.parse(req.body);
//     } catch (e) {
//       // Not JSON string, continue
//     }
//   }
//   next();
// });

// // Serve static files
// app.use('/static', express.static(path.join(__dirname, 'public')));
// app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// app.get('/health', (req, res) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV || 'development',
//     zkpStatus: zkpService.isInitialized ? 'initialized' : 'not initialized',  // FIXED: Remove ()
//     database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
//     services: {
//       database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
//       zkp: zkpService.isInitialized ? 'active' : 'inactive'  // FIXED: Remove ()
//     }
//   });
// });

// // API endpoint info
// app.get('/api', (req, res) => {
//   res.json({
//     message: 'Pramaan API v2.0',
//     version: '2.0.0',
//     endpoints: {
//       auth: '/api/auth',
//       organization: '/api/organization',
//       scholar: '/api/scholar',
//       attendance: '/api/attendance',
//       admin: '/api/admin',
//       biometric: '/api/biometric' // ADDED THIS LINE
//     },
//     documentation: '/api/docs'
//   });
// });

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/organization', organizationRoutes);
// app.use('/api/scholar', scholarRoutes);
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/biometric', biometricRoutes); // ADDED THIS LINE

// // 404 handler
// app.use((req, res) => {
//   logger.warn(`404 - Endpoint not found: ${req.method} ${req.url}`);
//   res.status(404).json({ 
//     error: 'Endpoint not found',
//     path: req.url,
//     method: req.method
//   });
// });

// // Enhanced error handling middleware
// app.use((err, req, res, next) => {
//   logger.error({
//     error: err.message,
//     stack: err.stack,
//     url: req.url,
//     method: req.method,
//     ip: req.ip,
//     body: req.body
//   });

//   // Handle specific error types
//   if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
//     return res.status(400).json({ 
//       error: 'Invalid JSON in request body',
//       details: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }

//   if (err.name === 'ValidationError') {
//     return res.status(400).json({
//       error: 'Validation Error',
//       details: Object.values(err.errors).map(e => e.message)
//     });
//   }

//   if (err.name === 'CastError') {
//     return res.status(400).json({
//       error: 'Invalid ID format'
//     });
//   }

//   if (err.code === 11000) {
//     const field = Object.keys(err.keyPattern)[0];
//     return res.status(409).json({
//       error: `Duplicate value for ${field}`
//     });
//   }

//   // Default error response
//   res.status(err.status || 500).json({
//     error: err.message || 'Internal server error',
//     ...(process.env.NODE_ENV === 'development' && { 
//       stack: err.stack,
//       details: err
//     })
//   });
// });

// // Initialize server
// async function startServer() {
//   try {
//     // Connect to MongoDB
//     await connectDatabase();
//     logger.info('✅ Database connected successfully');

//     // Initialize ZKP service
//     await zkpService.initialize();
//     logger.info('✅ ZKP Service initialized');

//     // In the server startup section (around line 260-270), change:
//     const server = app.listen(PORT, '0.0.0.0', () => {
//       console.log('\n========================================');
//       console.log('🚀 Pramaan Backend Server Started');
//       console.log('========================================');
//       console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
//       console.log(`🔐 ZKP Status: ${zkpService.isInitialized ? 'Active' : 'Simulation Mode'}`);  // FIXED: Remove ()
//       console.log(`🌐 Server URL: http://localhost:${PORT}`);
//       console.log('========================================');
      
//       // Log all available network interfaces
//       const networkInterfaces = os.networkInterfaces();
//       console.log('📡 Available on networks:');
//       Object.keys(networkInterfaces).forEach((interfaceName) => {
//         networkInterfaces[interfaceName].forEach((iface) => {
//           if (iface.family === 'IPv4' && !iface.internal) {
//             console.log(`   http://${iface.address}:${PORT}`);
//           }
//         });
//       });
//       console.log('========================================\n');
      
//       logger.info(`Server running on port ${PORT}`);
//     });

//     // Handle server errors
//     server.on('error', (error) => {
//       if (error.code === 'EADDRINUSE') {
//         logger.error(`Port ${PORT} is already in use`);
//         console.error(`\n❌ Error: Port ${PORT} is already in use!`);
//         console.error('Please either:');
//         console.error('1. Stop the other process using this port');
//         console.error('2. Change the PORT in your .env file\n');
//         process.exit(1);
//       } else {
//         throw error;
//       }
//     });

//   } catch (error) {
//     logger.error('Failed to start server:', error);
//     console.error('\n❌ Failed to start server:', error.message);
//     process.exit(1);
//   }
// }

// // Graceful shutdown handlers
// const gracefulShutdown = async (signal) => {
//   console.log(`\n${signal} received, shutting down gracefully...`);
//   logger.info(`${signal} received, shutting down gracefully...`);
  
//   try {
//     await mongoose.connection.close();
//     console.log('MongoDB connection closed');
//     process.exit(0);
//   } catch (error) {
//     console.error('Error during shutdown:', error);
//     process.exit(1);
//   }
// };

// process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// // Handle uncaught exceptions
// process.on('uncaughtException', (error) => {
//   logger.error('Uncaught Exception:', error);
//   console.error('\n❌ Uncaught Exception:', error);
//   process.exit(1);
// });

// process.on('unhandledRejection', (reason, promise) => {
//   logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   console.error('\n❌ Unhandled Rejection:', reason);
//   process.exit(1);
// });

// // Start the server
// startServer();

// // // backend/server.js - Main server file
// // import express from 'express';
// // import mongoose from 'mongoose';
// // import cors from 'cors';
// // import helmet from 'helmet';
// // import morgan from 'morgan';
// // import compression from 'compression';
// // import { fileURLToPath } from 'url';
// // import path from 'path';
// // import dotenv from 'dotenv';
// // import os from 'os';

// // // Import configurations
// // import { connectDatabase } from './src/config/database.js';
// // import { corsOptions } from './src/config/constants.js';

// // // Import routes
// // import authRoutes from './src/routes/auth.routes.js';
// // import organizationRoutes from './src/routes/organization.routes.js';
// // import scholarRoutes from './src/routes/scholar.routes.js';
// // import attendanceRoutes from './src/routes/attendance.routes.js';
// // import adminRoutes from './src/routes/admin.routes.js';

// // // Import middleware
// // import { errorHandler } from './src/middleware/error.middleware.js';
// // import { requestLogger } from './src/middleware/logger.middleware.js';

// // // Import services - Updated to import the singleton instance
// // import { zkpService } from './src/services/zkp.service.js';
// // import logger from './src/utils/logger.js';

// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);

// // // Load environment variables
// // dotenv.config({
// //   path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
// // });

// // // Initialize express app
// // const app = express();
// // const PORT = process.env.PORT || 5000;

// // // Middleware
// // app.use(helmet({
// //   contentSecurityPolicy: {
// //     directives: {
// //       defaultSrc: ["'self'"],
// //       styleSrc: ["'self'", "'unsafe-inline'"],
// //       scriptSrc: ["'self'", "'unsafe-inline'"],
// //       imgSrc: ["'self'", "data:", "blob:"],
// //       connectSrc: ["'self'"],
// //     },
// //   },
// // }));

// // // Add this to your main server file
// // const biometricRoutes = require('./src/routes/biometric.routes');
// // app.use('/api/biometric', biometricRoutes);

// // // Enhanced CORS configuration
// // app.use(cors({
// //   origin: function(origin, callback) {
// //     // Allow requests with no origin (like mobile apps)
// //     if (!origin) return callback(null, true);
    
// //     // Allow all origins in development
// //     if (process.env.NODE_ENV === 'development') {
// //       return callback(null, true);
// //     }
    
// //     // In production, check against whitelist
// //     const allowedOrigins = [
// //       'http://localhost:3000',
// //       'http://localhost:8081',
// //       /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
// //       /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
// //       /^exp:\/\/\d+\.\d+\.\d+\.\d+:\d+$/
// //     ];
    
// //     const allowed = allowedOrigins.some(allowed => {
// //       if (allowed instanceof RegExp) {
// //         return allowed.test(origin);
// //       }
// //       return allowed === origin;
// //     });
    
// //     callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
// //   },
// //   credentials: true,
// //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
// //   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
// //   exposedHeaders: ['X-Auth-Token']
// // }));

// // app.use(compression());

// // // Body parsing middleware with enhanced error handling
// // app.use(express.json({ 
// //   limit: '50mb',
// //   verify: (req, res, buf, encoding) => {
// //     try {
// //       JSON.parse(buf.toString());
// //     } catch (e) {
// //       // Check if it's double-stringified JSON
// //       const str = buf.toString();
// //       if (str.startsWith('"') && str.endsWith('"')) {
// //         try {
// //           // Remove outer quotes and parse
// //           const unescaped = JSON.parse(str);
// //           req.body = JSON.parse(unescaped);
// //           req._body = true; // Mark that body has been parsed
// //           return;
// //         } catch (innerError) {
// //           // Fall through to error
// //         }
// //       }
      
// //       logger.error('Invalid JSON in request body:', e.message);
// //       throw new SyntaxError('Invalid JSON');
// //     }
// //   }
// // }));

// // app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // // Logging middleware
// // app.use(morgan('combined', { 
// //   stream: { 
// //     write: message => logger.info(message.trim()) 
// //   },
// //   skip: (req, res) => req.url === '/health' // Skip health check logs
// // }));

// // app.use(requestLogger);

// // // Fix for double-stringified JSON (additional safety layer)
// // app.use((req, res, next) => {
// //   if (req.body && typeof req.body === 'string') {
// //     try {
// //       req.body = JSON.parse(req.body);
// //     } catch (e) {
// //       // Not JSON string, continue
// //     }
// //   }
// //   next();
// // });

// // // Serve static files
// // app.use('/static', express.static(path.join(__dirname, 'public')));
// // app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// // // Health check endpoint
// // app.get('/health', (req, res) => {
// //   res.json({
// //     status: 'ok',
// //     timestamp: new Date().toISOString(),
// //     uptime: process.uptime(),
// //     environment: process.env.NODE_ENV || 'development',
// //     zkpStatus: zkpService.isInitialized() ? 'initialized' : 'not initialized',
// //     database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
// //     services: {
// //       database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
// //       zkp: zkpService.isInitialized() ? 'active' : 'inactive'
// //     }
// //   });
// // });

// // // API endpoint info
// // app.get('/api', (req, res) => {
// //   res.json({
// //     message: 'Pramaan API v2.0',
// //     version: '2.0.0',
// //     endpoints: {
// //       auth: '/api/auth',
// //       organization: '/api/organization',
// //       scholar: '/api/scholar',
// //       attendance: '/api/attendance',
// //       admin: '/api/admin'
// //     },
// //     documentation: '/api/docs'
// //   });
// // });

// // // API Routes
// // app.use('/api/auth', authRoutes);
// // app.use('/api/organization', organizationRoutes);
// // app.use('/api/scholar', scholarRoutes);
// // app.use('/api/attendance', attendanceRoutes);
// // app.use('/api/admin', adminRoutes);

// // // 404 handler
// // app.use((req, res) => {
// //   logger.warn(`404 - Endpoint not found: ${req.method} ${req.url}`);
// //   res.status(404).json({ 
// //     error: 'Endpoint not found',
// //     path: req.url,
// //     method: req.method
// //   });
// // });

// // // Enhanced error handling middleware
// // app.use((err, req, res, next) => {
// //   logger.error({
// //     error: err.message,
// //     stack: err.stack,
// //     url: req.url,
// //     method: req.method,
// //     ip: req.ip,
// //     body: req.body
// //   });

// //   // Handle specific error types
// //   if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
// //     return res.status(400).json({ 
// //       error: 'Invalid JSON in request body',
// //       details: process.env.NODE_ENV === 'development' ? err.message : undefined
// //     });
// //   }

// //   if (err.name === 'ValidationError') {
// //     return res.status(400).json({
// //       error: 'Validation Error',
// //       details: Object.values(err.errors).map(e => e.message)
// //     });
// //   }

// //   if (err.name === 'CastError') {
// //     return res.status(400).json({
// //       error: 'Invalid ID format'
// //     });
// //   }

// //   if (err.code === 11000) {
// //     const field = Object.keys(err.keyPattern)[0];
// //     return res.status(409).json({
// //       error: `Duplicate value for ${field}`
// //     });
// //   }

// //   // Default error response
// //   res.status(err.status || 500).json({
// //     error: err.message || 'Internal server error',
// //     ...(process.env.NODE_ENV === 'development' && { 
// //       stack: err.stack,
// //       details: err
// //     })
// //   });
// // });

// // // Initialize server
// // async function startServer() {
// //   try {
// //     // Connect to MongoDB
// //     await connectDatabase();
// //     logger.info('✅ Database connected successfully');

// //     // Initialize ZKP service
// //     await zkpService.initialize();
// //     logger.info('✅ ZKP Service initialized');

// //     // Start server - bind to all network interfaces
// //     const server = app.listen(PORT, '0.0.0.0', () => {
// //       console.log('\n========================================');
// //       console.log('🚀 Pramaan Backend Server Started');
// //       console.log('========================================');
// //       console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
// //       console.log(`🔐 ZKP Status: ${zkpService.isInitialized() ? 'Active' : 'Simulation Mode'}`);
// //       console.log(`🌐 Server URL: http://localhost:${PORT}`);
// //       console.log('========================================');
      
// //       // Log all available network interfaces
// //       const networkInterfaces = os.networkInterfaces();
// //       console.log('📡 Available on networks:');
// //       Object.keys(networkInterfaces).forEach((interfaceName) => {
// //         networkInterfaces[interfaceName].forEach((iface) => {
// //           if (iface.family === 'IPv4' && !iface.internal) {
// //             console.log(`   http://${iface.address}:${PORT}`);
// //           }
// //         });
// //       });
// //       console.log('========================================\n');
      
// //       logger.info(`Server running on port ${PORT}`);
// //     });

// //     // Handle server errors
// //     server.on('error', (error) => {
// //       if (error.code === 'EADDRINUSE') {
// //         logger.error(`Port ${PORT} is already in use`);
// //         console.error(`\n❌ Error: Port ${PORT} is already in use!`);
// //         console.error('Please either:');
// //         console.error('1. Stop the other process using this port');
// //         console.error('2. Change the PORT in your .env file\n');
// //         process.exit(1);
// //       } else {
// //         throw error;
// //       }
// //     });

// //   } catch (error) {
// //     logger.error('Failed to start server:', error);
// //     console.error('\n❌ Failed to start server:', error.message);
// //     process.exit(1);
// //   }
// // }

// // // Graceful shutdown handlers
// // const gracefulShutdown = async (signal) => {
// //   console.log(`\n${signal} received, shutting down gracefully...`);
// //   logger.info(`${signal} received, shutting down gracefully...`);
  
// //   try {
// //     await mongoose.connection.close();
// //     console.log('MongoDB connection closed');
// //     process.exit(0);
// //   } catch (error) {
// //     console.error('Error during shutdown:', error);
// //     process.exit(1);
// //   }
// // };

// // process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// // process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// // // Handle uncaught exceptions
// // process.on('uncaughtException', (error) => {
// //   logger.error('Uncaught Exception:', error);
// //   console.error('\n❌ Uncaught Exception:', error);
// //   process.exit(1);
// // });

// // process.on('unhandledRejection', (reason, promise) => {
// //   logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
// //   console.error('\n❌ Unhandled Rejection:', reason);
// //   process.exit(1);
// // });

// // // Start the server
// // startServer();