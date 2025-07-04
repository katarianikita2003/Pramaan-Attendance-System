import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test routes
app.post('/api/auth/register-organization', (req, res) => {
  const { organizationName, organizationType, adminName, adminEmail, adminPassword } = req.body;
  
  // Simulated response
  res.json({
    message: 'Organization registered successfully (simulated)',
    organization: {
      id: 'sim_' + Date.now(),
      name: organizationName,
      code: organizationName.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
      type: organizationType
    },
    token: 'simulated_jwt_token_' + Date.now()
  });
});

// Start server
async function startServer() {
  // Try to connect to MongoDB, but don't fail if it's not available
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected');
    } catch (error) {
      console.log('⚠️  MongoDB not connected, running without database');
      console.log('   Some features will be limited');
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Pramaan Backend Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔐 ZKP Mode: Simulation`);
  });
}

startServer();