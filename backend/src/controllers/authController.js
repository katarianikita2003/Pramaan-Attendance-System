// backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import Organization from '../models/Organization.js';
import { zkpService } from '../services/zkpService.js';
import logger from '../utils/logger.js';

// Register new organization and admin
export const register = async (req, res) => {
  try {
    const { 
      organizationName, 
      organizationCode, 
      adminName, 
      adminEmail, 
      password,
      campusLocation 
    } = req.body;

    // Validate required fields
    if (!organizationName || !organizationCode || !adminName || !adminEmail || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if organization code already exists
    const existingOrg = await Organization.findOne({ code: organizationCode });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization code already exists' });
    }

    // Check if admin email already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin email already exists' });
    }

    // Create organization
    const organization = new Organization({
      name: organizationName,
      code: organizationCode,
      campusLocations: campusLocation ? [{
        name: 'Main Campus',
        latitude: campusLocation.latitude,
        longitude: campusLocation.longitude,
        radius: campusLocation.radius || 100
      }] : []
    });

    await organization.save();
    logger.info(`Organization created: ${organization.name}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin - IMPORTANT: Use 'password' field, not 'passwordHash'
    const admin = new Admin({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,  // Use 'password' field
      organizationId: organization._id
    });

    await admin.save();
    logger.info(`Admin created: ${admin.email}`);

    // Generate token
    const token = jwt.sign(
      { 
        userId: admin._id, 
        role: 'admin',
        organizationId: organization._id 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      organization: {
        id: organization._id,
        name: organization.name,
        code: organization.code
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info(`Admin login attempt for: ${email}`);

    // Find admin by email - email is nested in personalInfo
    const admin = await Admin.findOne({ 'personalInfo.email': email }).populate('organizationId');
    
    if (!admin) {
      logger.warn(`Admin not found: ${email}`);
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    // Check password - password is in credentials.passwordHash
    if (!admin.credentials?.passwordHash) {
      logger.error(`No password found for admin: ${email}`);
      return res.status(500).json({ message: 'Account configuration error' });
    }

    // Use the model's comparePassword method
    const isValidPassword = await admin.comparePassword(password);
    
    if (!isValidPassword) {
      logger.warn(`Invalid password for admin: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: admin._id, 
        role: 'admin',
        organizationId: admin.organizationId._id 
      },
      process.env.JWT_SECRET || 'your-secret-key',
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
        organizationId: admin.organizationId._id
      },
      organization: admin.organizationId
    });

  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Scholar login with biometric
export const scholarLogin = async (req, res) => {
  try {
    const { scholarId, organizationCode, biometricData } = req.body;

    logger.info(`Scholar login attempt: ${scholarId}`);

    // Find organization
    const organization = await Organization.findOne({ code: organizationCode });
    if (!organization) {
      return res.status(404).json({ message: 'Invalid organization code' });
    }

    // Find scholar
    const scholar = await Scholar.findOne({ 
      scholarId, 
      organizationId: organization._id 
    });

    if (!scholar) {
      return res.status(404).json({ message: 'Invalid scholar ID' });
    }

    // Verify biometric using ZKP
    const biometricValid = await zkpService.verifyBiometric(
      scholar._id,
      biometricData
    );

    if (!biometricValid) {
      return res.status(401).json({ message: 'Biometric verification failed' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: scholar._id, 
        role: 'scholar',
        organizationId: organization._id 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    logger.info(`Scholar login successful: ${scholarId}`);

    res.json({
      message: 'Login successful',
      token,
      scholar: {
        id: scholar._id,
        scholarId: scholar.scholarId,
        name: scholar.name,
        email: scholar.email
      },
      organization: {
        id: organization._id,
        name: organization.name,
        code: organization.code
      }
    });

  } catch (error) {
    logger.error('Scholar login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Logout (optional - mainly for client-side token removal)
export const logout = async (req, res) => {
  try {
    // In a JWT system, logout is handled client-side by removing the token
    // You could implement a token blacklist here if needed
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};