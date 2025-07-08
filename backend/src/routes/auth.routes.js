// backend/src/routes/auth.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Admin login
router.post('/admin-login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find admin
      const admin = await Admin.findOne({ 'personalInfo.email': email })
        .populate('organizationId');

      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (admin.isLocked) {
        return res.status(423).json({ 
          error: 'Account is locked. Please try again later.' 
        });
      }

      // Check if admin is active
      if (!admin.status.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.credentials.password);

      if (!isPasswordValid) {
        await admin.incLoginAttempts();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Reset login attempts
      await admin.resetLoginAttempts();

      // Generate token
      const token = jwt.sign(
        { 
          userId: admin._id,
          organizationId: admin.organizationId._id,
          role: admin.role,
          permissions: admin.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info(`Admin login successful: ${email}`);

      res.json({
        message: 'Login successful',
        token,
        admin: {
          id: admin._id,
          name: admin.personalInfo.name,
          email: admin.personalInfo.email,
          role: admin.role
        },
        organization: {
          id: admin.organizationId._id,
          name: admin.organizationId.name,
          code: admin.organizationId.code,
          subscription: admin.organizationId.subscription
        }
      });

    } catch (error) {
      logger.error('Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Scholar login (biometric-based)
router.post('/scholar-login',
  [
    body('scholarId').notEmpty().trim().toUpperCase(),
    body('organizationCode').notEmpty().trim().toUpperCase(),
    body('biometricData').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scholarId, organizationCode, biometricData } = req.body;

      // Find organization
      const organization = await Organization.findOne({ 
        code: organizationCode,
        isActive: true
      });

      if (!organization) {
        return res.status(404).json({ error: 'Invalid organization code' });
      }

      // Find scholar
      const scholar = await Scholar.findOne({
        organizationId: organization._id,
        scholarId: scholarId,
        'status.isActive': true
      });

      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }

      // For MVP, we'll do a simple check
      // In production, this would use actual biometric verification
      const isValid = true; // Placeholder for biometric verification

      if (!isValid) {
        return res.status(401).json({ error: 'Biometric verification failed' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          userId: scholar._id,
          organizationId: organization._id,
          role: 'scholar',
          scholarId: scholar.scholarId
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      logger.info(`Scholar login successful: ${scholarId}`);

      res.json({
        message: 'Login successful',
        token,
        scholar: {
          id: scholar._id,
          scholarId: scholar.scholarId,
          name: scholar.personalInfo.name,
          email: scholar.personalInfo.email,
          attendance: scholar.attendance
        },
        organization: {
          id: organization._id,
          name: organization.name,
          code: organization.code
        }
      });

    } catch (error) {
      logger.error('Scholar login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const newToken = jwt.sign(
      { 
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        role: decoded.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;