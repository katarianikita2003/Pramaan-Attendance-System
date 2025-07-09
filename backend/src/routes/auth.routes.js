// backend/src/routes/auth.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
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
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info(`Admin login attempt for: ${email}`);

    // Find admin by email
    const admin = await Admin.findOne({ 'personalInfo.email': email })
      .populate('organizationId');

    if (!admin) {
      logger.warn(`Admin not found: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    logger.info(`Admin found: ${admin.personalInfo.email}, comparing passwords...`);

    // Check password - handle both direct hash and comparePassword method
    let isMatch = false;

    if (admin.comparePassword) {
      // Use the model method if available
      isMatch = await admin.comparePassword(password);
    } else {
      // Direct bcrypt compare
      isMatch = await bcrypt.compare(password, admin.credentials.passwordHash);
    }
    
    logger.info(`Password match result: ${isMatch}`);

    if (!isMatch) {
      logger.warn(`Invalid password for admin: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check if admin is active
    if (admin.status !== 'active') {
      logger.warn(`Inactive admin account: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Account is not active' 
      });
    }

    logger.info(`Admin login successful: ${admin.personalInfo.email}`);

    res.json({
      success: true,
      token: generateToken(admin._id, 'admin', admin.organizationId._id),
      user: {
        id: admin._id,
        name: admin.personalInfo.name,
        email: admin.personalInfo.email,
        role: 'admin',
        organizationId: admin.organizationId._id,
        organizationCode: admin.organizationId.code,
        userType: 'admin',
      },
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({
      success: false, 
      error: 'Login failed',
      details: error.message 
    });
  }
});

// @route   POST /api/auth/scholar/login
// @desc    Scholar login
// @access  Public
router.post('/scholar/login', async (req, res) => {
  try {
    const { email, password, organizationCode } = req.body;

    logger.info(`Scholar login attempt for: ${email} with org code: ${organizationCode}`);

    // Find organization by code
    const organization = await Organization.findOne({ 
      code: organizationCode.toUpperCase() 
    });

    if (!organization) {
      logger.warn(`Invalid organization code: ${organizationCode}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid organization code' 
      });
    }

    // Find scholar
    const scholar = await Scholar.findOne({
      'personalInfo.email': email,
      organizationId: organization._id,
    });

    if (!scholar) {
      logger.warn(`Scholar not found: ${email} in org: ${organizationCode}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials'
      });
    }

    logger.info(`Scholar found: ${scholar.personalInfo.email}, comparing passwords...`);

    // Check password
    let isMatch = false;

    if (scholar.comparePassword) {
      isMatch = await scholar.comparePassword(password);
    } else {
      isMatch = await bcrypt.compare(password, scholar.credentials.passwordHash);
    }

    logger.info(`Password match result: ${isMatch}`);

    if (!isMatch) {
      logger.warn(`Invalid password for scholar: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check if scholar is active
    if (scholar.status !== 'active') {
      logger.warn(`Inactive scholar account: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Account is not active' 
      });
    }

    logger.info(`Scholar login successful: ${scholar.personalInfo.email}`);

    res.json({
      success: true,
      token: generateToken(scholar._id, 'scholar', organization._id, { scholarId: scholar.scholarId }),
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

    // Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);

    logger.info('Password hashed successfully');

    // Create admin
    const newAdmin = await Admin.create({
      personalInfo: {
        name: admin.name,
        email: admin.email,
        phone: admin.phone || organization.contactNumber,
      },
      organizationId: newOrg._id,
      credentials: {
        passwordHash: hashedPassword,
      },
      role: 'admin',
      status: 'active',
      isActive: true,
      permissions: ['manage_scholars', 'view_reports', 'manage_attendance'],
    });

    // Verify the password works (for debugging)
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
      token: newToken 
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Password reset request
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ 
        error: 'Email and user type required' 
      });
    }

    if (userType === 'admin') {
      const admin = await Admin.findOne({ 'personalInfo.email': email });
      if (!admin) {
        // Don't reveal if email exists
        return res.json({ 
          success: true,
          message: 'If the email exists, a reset link has been sent' 
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: admin._id, type: 'password-reset' },
        process.env.JWT_SECRET || 'pramaan-secret-key',
        { expiresIn: '1h' }
      );

      // In production, send email with reset link
      // For now, just log it
      logger.info(`Password reset requested for admin: ${email}, token: ${resetToken}`);

    } else if (userType === 'scholar') {
      const scholar = await Scholar.findOne({ 'personalInfo.email': email });
      if (!scholar) {
        return res.json({ 
          success: true,
          message: 'If the email exists, a reset link has been sent' 
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: scholar._id, type: 'password-reset' },
        process.env.JWT_SECRET || 'pramaan-secret-key',
        { expiresIn: '1h' }
      );

      logger.info(`Password reset requested for scholar: ${email}, token: ${resetToken}`);
    }

    res.json({ 
      success: true,
      message: 'If the email exists, a reset link has been sent' 
    });

  } catch (error) {
    logger.error('Password reset error:', error);
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
    const { token, newPassword, userType } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Token and new password required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pramaan-secret-key');
    
    if (decoded.type !== 'password-reset') {
      return res.status(401).json({ 
        error: 'Invalid reset token' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (userType === 'admin') {
      await Admin.findByIdAndUpdate(decoded.id, {
        'credentials.passwordHash': hashedPassword
      });
    } else {
      await Scholar.findByIdAndUpdate(decoded.id, {
        'credentials.passwordHash': hashedPassword
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

export default router;