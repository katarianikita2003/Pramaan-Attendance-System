// backend/src/routes/auth.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Generate JWT token with complete user info
const generateToken = (userId, role, organizationId, additionalInfo = {}) => {
  return jwt.sign(
    { 
      id: userId,
      userId: userId, // Keep both for compatibility
      role,
      organizationId,
      ...additionalInfo
    }, 
    process.env.JWT_SECRET || 'pramaan-secret-key', 
    {
      expiresIn: '30d',
    }
  );
};

// @route   POST /api/auth/admin/login
// @desc    Admin login
// @access  Public
router.post('/admin-login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().trim() // Add trim to remove whitespace
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      logger.info(`Admin login attempt for: ${email}`);

      // Find admin with password field
      const admin = await Admin.findOne({ 'personalInfo.email': email })
        .select('+credentials.passwordHash') // Only select passwordHash
        .populate('organizationId');

      if (!admin) {
        logger.warn(`Admin not found: ${email}`);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      // Check if account is active
      if (!admin.isActive || admin.status !== 'active') {
        return res.status(403).json({ 
          success: false,
          error: 'Account is inactive' 
        });
      }

      // Check if organization exists and is active
      if (!admin.organizationId || !admin.organizationId.isActive) {
        return res.status(403).json({ 
          success: false,
          error: 'Organization is inactive' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password.trim(), admin.credentials.passwordHash);

      if (!isPasswordValid) {
        logger.warn(`Invalid password for admin: ${email}`);
        
        // Update login attempts if method exists
        admin.metadata.loginCount = (admin.metadata.loginCount || 0) + 1;
        await admin.save();
        
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      // Update last login
      admin.metadata.lastLogin = new Date();
      admin.metadata.loginCount = (admin.metadata.loginCount || 0) + 1;
      await admin.save();

      // Generate token
      const token = generateToken(
        admin._id.toString(),
        admin.role,
        admin.organizationId._id.toString()
      );

      logger.info(`Admin login successful: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: admin._id,
          name: admin.personalInfo.name,
          email: admin.personalInfo.email,
          role: admin.role,
          organizationId: admin.organizationId._id,
          organizationCode: admin.organizationId.code,
          userType: 'admin'
        },
        organization: {
          id: admin.organizationId._id,
          name: admin.organizationId.name,
          code: admin.organizationId.code,
          type: admin.organizationId.type
        }
      });

    } catch (error) {
      logger.error('Admin login error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/auth/scholar/login
// @desc    Scholar login with biometric or password
// @access  Public
router.post('/scholar/login', async (req, res) => {
  try {
    const { email, password, organizationCode, biometricData } = req.body;

    logger.info(`Scholar login attempt for: ${email} with org code: ${organizationCode}`);

    // Find organization by code
    const organization = await Organization.findOne({ code: organizationCode });
    
    if (!organization) {
      logger.warn(`Organization not found with code: ${organizationCode}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Find scholar
    const scholar = await Scholar.findOne({
      'personalInfo.email': email,
      organizationId: organization._id
    }).select('+credentials.passwordHash');

    if (!scholar) {
      logger.warn(`Scholar not found: ${email} in org: ${organizationCode}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check if scholar is active
    if (!scholar.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Account is deactivated' 
      });
    }

    let isAuthenticated = false;

    if (biometricData) {
      // Handle biometric authentication (implementation depends on your biometric service)
      // For now, this is a placeholder
      logger.info('Biometric authentication attempted');
      // isAuthenticated = await biometricService.verify(scholar.biometricData, biometricData);
    } else if (password) {
      // Password authentication - check passwordHash only
      const storedPassword = scholar.credentials?.passwordHash;
      
      if (!storedPassword) {
        logger.error(`No password found for scholar: ${email}`);
        return res.status(500).json({ 
          success: false,
          error: 'Account configuration error' 
        });
      }

      isAuthenticated = await bcrypt.compare(password, storedPassword);
    }

    if (!isAuthenticated) {
      logger.warn(`Invalid authentication for scholar: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    scholar.activity = scholar.activity || {};
    scholar.activity.lastLogin = new Date();
    await scholar.save();

    // Generate token
    const token = generateToken(
      scholar._id.toString(),
      'scholar',
      organization._id.toString(),
      { scholarId: scholar.scholarId }
    );

    logger.info(`Scholar login successful: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: scholar._id,
        name: scholar.personalInfo.name,
        email: scholar.personalInfo.email,
        scholarId: scholar.scholarId,
        role: 'scholar',
        organizationId: organization._id,
        organizationCode: organization.code,
        userType: 'scholar',
      },
    });
  } catch (error) {
    logger.error('Scholar login error:', error);
    res.status(500).json({
      success: false, 
      error: 'Login failed',
      details: error.message
    });
  }
});

// @route   POST /api/auth/register-organization
// @desc    Register new organization with admin
// @access  Public
router.post('/register-organization', async (req, res) => {
  try {
    const { organization, admin, boundaries } = req.body;

    logger.info('Registration attempt:', { 
      orgName: organization.name, 
      adminEmail: admin.email 
    });

    // Check if organization already exists
    const orgExists = await Organization.findOne({ 
      $or: [
        { name: organization.name }, 
        { 'contact.email': admin.email }
      ] 
    });

    if (orgExists) {
      return res.status(400).json({ 
        success: false,
        error: 'Organization or admin email already exists' 
      });
    }

    // Check if admin email already exists
    const adminExists = await Admin.findOne({ 
      'personalInfo.email': admin.email 
    });

    if (adminExists) {
      return res.status(400).json({ 
        success: false,
        error: 'Admin email already registered' 
      });
    }

    // Generate unique organization code
    const orgCode = 'ORG' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Create organization
    const newOrg = await Organization.create({
      name: organization.name,
      code: orgCode,
      type: organization.type || 'educational',
      contact: {
        email: admin.email,
        phone: admin.phone || organization.contactNumber,
        address: organization.address,
      },
      location: {
        coordinates: {
          latitude: boundaries?.center?.latitude || 0,
          longitude: boundaries?.center?.longitude || 0,
        },
        radius: boundaries?.radius || 500,
      },
      status: 'active',
      subscription: {
        plan: 'free',
        maxScholars: 50,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);

    logger.info('Password hashed successfully');

    // Create admin - IMPORTANT: Set passwordHash field consistently
    const newAdmin = await Admin.create({
      personalInfo: {
        name: admin.name,
        email: admin.email,
        phone: admin.phone || organization.contactNumber,
      },
      organizationId: newOrg._id,
      credentials: {
        passwordHash: hashedPassword,  // ONLY use passwordHash
        twoFactorEnabled: false,
        lastPasswordChange: new Date()
      },
      role: 'admin',
      status: 'active',
      isActive: true,
      permissions: ['manage_scholars', 'view_reports', 'manage_attendance'],
    });

    // Verify the password works
    const passwordVerification = await bcrypt.compare(admin.password, hashedPassword);
    logger.info(`Password verification: ${passwordVerification}`);

    logger.info(`New organization registered: ${newOrg.name} (${orgCode})`);

    res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      organizationCode: orgCode,
      token: generateToken(newAdmin._id, 'admin', newOrg._id),
      user: {
        id: newAdmin._id,
        name: newAdmin.personalInfo.name,
        email: newAdmin.personalInfo.email,
        role: 'admin',
        organizationId: newOrg._id,
        organizationCode: orgCode,
        userType: 'admin',
      },
    });
  } catch (error) {
    logger.error('Organization registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register organization',
      details: error.message
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pramaan-secret-key');
    
    const newToken = generateToken(
      decoded.id || decoded.userId,
      decoded.role,
      decoded.organizationId,
      decoded.scholarId ? { scholarId: decoded.scholarId } : {}
    );

    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }
    logger.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token' 
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user (admin or scholar)
    let user = await Admin.findOne({ 'personalInfo.email': email });
    let userType = 'admin';

    if (!user) {
      user = await Scholar.findOne({ 'personalInfo.email': email });
      userType = 'scholar';
    }

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ 
        success: true,
        message: 'If the email exists, a reset link has been sent' 
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { 
        id: user._id,
        type: userType,
        purpose: 'password-reset'
      },
      process.env.JWT_SECRET || 'pramaan-secret-key',
      { expiresIn: '1h' }
    );

    // In production, send email with reset link
    // For now, just return the token
    logger.info(`Password reset requested for: ${email}`);

    res.json({
      success: true,
      message: 'Password reset link sent to email',
      // Remove this in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ 
      error: 'Failed to process request' 
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pramaan-secret-key');

    if (decoded.purpose !== 'password-reset') {
      return res.status(401).json({ 
        error: 'Invalid reset token' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password based on user type
    if (decoded.type === 'admin') {
      await Admin.findByIdAndUpdate(decoded.id, {
        'credentials.passwordHash': hashedPassword,
        'credentials.lastPasswordChange': new Date()
      });
    } else {
      await Scholar.findByIdAndUpdate(decoded.id, {
        'credentials.passwordHash': hashedPassword,
        'credentials.lastPasswordChange': new Date()
      });
    }

    logger.info(`Password reset successful for user: ${decoded.id}`);

    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Reset token expired' 
      });
    }
    logger.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset password' 
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout (optional - for token blacklisting in future)
// @access  Private
router.post('/logout', async (req, res) => {
  // In a production app, you might want to blacklist the token here
  // For now, just return success
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

// Test endpoint to check token contents
router.get('/test-token', authenticateToken, async (req, res) => {
  try {
    logger.info('Test token endpoint - req.user:', JSON.stringify(req.user, null, 2));
    
    // Get the actual admin from database
    const admin = await Admin.findById(req.user.id).populate('organizationId');
    
    res.json({
      tokenData: {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        role: req.user.role
      },
      adminData: admin ? {
        id: admin._id,
        email: admin.personalInfo.email,
        organizationId: admin.organizationId?._id,
        organizationName: admin.organizationId?.name,
        organizationCode: admin.organizationId?.code
      } : null
    });
  } catch (error) {
    logger.error('Test token error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;