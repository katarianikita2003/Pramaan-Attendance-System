// ===== backend/src/routes/auth.routes.js =====
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import Scholar from '../models/Scholar.js';
import { EmailService } from '../services/email.service.js';
import { rateLimiters } from '../middleware/rateLimit.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
const emailService = new EmailService();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

const registerValidation = [
  body('organizationName').notEmpty().trim(),
  body('organizationType').isIn(['university', 'school', 'college', 'office', 'other']),
  body('adminName').notEmpty().trim(),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPassword').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/),
  body('adminPhone').optional().isMobilePhone()
];

// Register organization
router.post('/register-organization', 
  rateLimiters.auth,
  registerValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        organizationName,
        organizationType,
        adminName,
        adminEmail,
        adminPassword,
        adminPhone
      } = req.body;

      // Check if email already exists
      const existingOrg = await Organization.findOne({ 'admin.email': adminEmail });
      if (existingOrg) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Generate organization code
      const orgCode = await Organization.generateUniqueCode(organizationName);

      // Hash password
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create organization
      const organization = new Organization({
        name: organizationName,
        code: orgCode,
        type: organizationType,
        admin: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          phone: adminPhone
        },
        verificationToken,
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await organization.save();

      // Send verification email
      await emailService.sendVerificationEmail(adminEmail, verificationToken, organizationName);

      // Generate JWT
      const token = jwt.sign(
        {
          organizationId: organization._id,
          adminEmail: adminEmail,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      logger.info(`New organization registered: ${organizationName} (${orgCode})`);

      res.status(201).json({
        message: 'Organization registered successfully',
        organization: {
          id: organization._id,
          name: organization.name,
          code: orgCode,
          type: organization.type
        },
        token
      });
    } catch (error) {
      logger.error('Organization registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Admin login
router.post('/admin-login',
  rateLimiters.auth,
  loginValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const organization = await Organization.findOne({ 'admin.email': email });
      if (!organization) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await organization.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!organization.isActive) {
        return res.status(403).json({ error: 'Organization account is inactive' });
      }

      // Update last active
      organization.stats.lastActiveDate = new Date();
      await organization.save();

      const token = jwt.sign(
        {
          organizationId: organization._id,
          adminEmail: email,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Login successful',
        organization: {
          id: organization._id,
          name: organization.name,
          code: organization.code,
          type: organization.type,
          subscription: organization.subscription
        },
        token
      });
    } catch (error) {
      logger.error('Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Scholar login
router.post('/scholar-login',
  rateLimiters.auth,
  [
    body('scholarId').notEmpty().trim(),
    body('organizationCode').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scholarId, organizationCode } = req.body;

      // Find organization
      const organization = await Organization.findOne({ 
        code: organizationCode.toUpperCase(),
        isActive: true
      });

      if (!organization) {
        return res.status(404).json({ error: 'Invalid organization code' });
      }

      // Find scholar
      const scholar = await Scholar.findOne({
        organizationId: organization._id,
        scholarId: scholarId.toUpperCase(),
        'status.isActive': true
      });

      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }

      // Check if biometric enrollment is complete
      const isEnrolled = scholar.biometricData.enrollmentStatus.fingerprint &&
                        scholar.biometricData.enrollmentStatus.face;

      const token = jwt.sign(
        {
          scholarId: scholar._id,
          organizationId: organization._id,
          role: 'scholar'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Login successful',
        scholar: {
          id: scholar._id,
          scholarId: scholar.scholarId,
          name: scholar.personalInfo.name,
          email: scholar.personalInfo.email,
          department: scholar.academicInfo.department,
          isEnrolled,
          zkpPublicKey: scholar.zkpData.publicKey
        },
        organization: {
          name: organization.name,
          code: organization.code
        },
        token
      });
    } catch (error) {
      logger.error('Scholar login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Password reset request
router.post('/forgot-password',
  rateLimiters.auth,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;

      const organization = await Organization.findOne({ 'admin.email': email });
      if (!organization) {
        // Don't reveal if email exists
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      organization.admin.resetPasswordToken = hashedToken;
      organization.admin.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await organization.save();

      // Send reset email
      await emailService.sendPasswordReset(email, resetToken, organization.name);

      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

// Reset password
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/)
  ],
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const organization = await Organization.findOne({
        'admin.resetPasswordToken': hashedToken,
        'admin.resetPasswordExpires': { $gt: Date.now() }
      });

      if (!organization) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Update password
      organization.admin.passwordHash = await bcrypt.hash(newPassword, 12);
      organization.admin.resetPasswordToken = undefined;
      organization.admin.resetPasswordExpires = undefined;
      await organization.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

export default router;