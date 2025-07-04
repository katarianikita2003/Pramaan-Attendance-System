import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Pramaan Backend Running',
    mode: 'minimal',
    timestamp: new Date().toISOString()
  });
});

// Start server without MongoDB for now
app.listen(PORT, () => {
  console.log(`🚀 Pramaan Backend Server running on port ${PORT}`);
  console.log(`🔧 Running in minimal mode`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});