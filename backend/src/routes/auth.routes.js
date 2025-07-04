import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import logger from '../utils/logger.js';
import { rateLimiters } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// Register organization
router.post('/register-organization',
  rateLimiters.auth,
  [
    body('organizationName').notEmpty().trim(),
    body('organizationType').isIn(['university', 'school', 'corporate', 'government']),
    body('adminName').notEmpty().trim(),
    body('adminEmail').isEmail().normalizeEmail(),
    body('adminPassword').isLength({ min: 8 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { organizationName, organizationType, adminName, adminEmail, adminPassword } = req.body;

      // Check if organization already exists
      const existingOrg = await Organization.findOne({ 'admin.email': adminEmail });
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization already registered' });
      }

      // Generate organization code
      const orgCode = organizationName.substring(0, 3).toUpperCase() + 
                     Date.now().toString().slice(-4);

      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Create organization
      const organization = new Organization({
        name: organizationName,
        code: orgCode,
        type: organizationType,
        admin: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword
        }
      });

      await organization.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          adminEmail,
          organizationId: organization._id,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info(`New organization registered: ${organizationName} (${orgCode})`);

      res.status(201).json({
        message: 'Organization registered successfully',
        organizationCode: orgCode,
        token
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post('/login',
  rateLimiters.auth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('organizationCode').notEmpty().trim().toUpperCase()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, organizationCode } = req.body;

      // Find organization
      const organization = await Organization.findOne({ 
        code: organizationCode,
        'admin.email': email 
      });

      if (!organization) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, organization.admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          adminEmail: email,
          organizationId: organization._id,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        organization: {
          name: organization.name,
          code: organization.code,
          type: organization.type
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

export default router;