// backend/src/routes/organization.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import Admin from '../models/Admin.js';
import Scholar from '../models/Scholar.js';
import AttendanceProof from '../models/AttendanceProof.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Organization self-registration
router.post('/register',
  [
    body('organizationName').notEmpty().trim(),
    body('adminName').notEmpty().trim(),
    body('adminEmail').isEmail().normalizeEmail(),
    body('adminPassword').isLength({ min: 8 }),
    body('address').notEmpty(),
    body('contactNumber').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        organizationName,
        adminName,
        adminEmail,
        adminPassword,
        address,
        contactNumber,
        type = 'educational'
      } = req.body;

      // Check if organization or admin already exists
      const existingOrg = await Organization.findOne({ 
        $or: [
          { name: organizationName },
          { 'contact.email': adminEmail }
        ]
      });

      if (existingOrg) {
        return res.status(400).json({ 
          error: 'Organization or email already registered' 
        });
      }

      // Generate unique organization code
      const orgCode = await generateUniqueOrgCode(organizationName);

      // Create organization
      const organization = new Organization({
        name: organizationName,
        code: orgCode,
        type,
        contact: {
          email: adminEmail,
          phone: contactNumber,
          address
        },
        subscription: {
          plan: 'free',
          scholarLimit: 50,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        }
      });

      await organization.save();

      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin
      const admin = new Admin({
        organizationId: organization._id,
        personalInfo: {
          name: adminName,
          email: adminEmail
        },
        credentials: {
          password: hashedPassword
        },
        role: 'admin',
        permissions: ['all']
      });

      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: admin._id,
          organizationId: organization._id,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info(`New organization registered: ${organizationName}`);

      res.status(201).json({
        message: 'Organization registered successfully',
        organization: {
          id: organization._id,
          name: organization.name,
          code: organization.code
        },
        admin: {
          id: admin._id,
          name: adminName,
          email: adminEmail
        },
        token
      });

    } catch (error) {
      logger.error('Organization registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Get organization details
router.get('/details', 
  authenticateToken,
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID not found' });
      }
      
      const organization = await Organization.findById(organizationId)
        .select('-__v -createdAt -updatedAt');
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      res.json({
        organization: {
          id: organization._id,
          name: organization.name,
          code: organization.code,
          type: organization.type,
          contact: organization.contact,
          subscription: organization.subscription,
          settings: organization.settings,
          stats: organization.stats,
          isActive: organization.isActive,
          isVerified: organization.isVerified
        }
      });
    } catch (error) {
      logger.error('Get organization details error:', error);
      res.status(500).json({ error: 'Failed to fetch organization details' });
    }
  }
);

// Update organization details
router.put('/details',
  authenticateToken,
  requireRole('admin'),
  [
    body('name').optional().trim(),
    body('contact.phone').optional().trim(),
    body('contact.address').optional().trim(),
    body('settings.attendanceWindow').optional().isObject(),
    body('settings.locationBounds').optional().isObject()
  ],
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      const updates = req.body;
      
      const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      res.json({
        message: 'Organization updated successfully',
        organization: {
          id: organization._id,
          name: organization.name,
          code: organization.code,
          contact: organization.contact,
          settings: organization.settings
        }
      });
    } catch (error) {
      logger.error('Update organization error:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

// Get organization statistics
router.get('/stats',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Get real-time statistics
      const totalScholars = await Scholar.countDocuments({ organizationId });
      const activeScholars = await Scholar.countDocuments({ 
        organizationId, 
        status: 'active' 
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayAttendance = await AttendanceProof.countDocuments({
        organizationId,
        date: { $gte: today }
      });
      
      res.json({
        stats: {
          totalScholars,
          activeScholars,
          todayAttendance,
          scholarLimit: organization.subscription.scholarLimit,
          subscriptionPlan: organization.subscription.plan,
          subscriptionEndDate: organization.subscription.endDate
        }
      });
    } catch (error) {
      logger.error('Get organization stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// Helper function to generate unique organization code
async function generateUniqueOrgCode(orgName) {
  const baseCode = orgName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  
  let code = baseCode;
  let counter = 1;
  
  while (await Organization.findOne({ code })) {
    code = `${baseCode}${counter}`;
    counter++;
  }
  
  return code.padEnd(6, Math.random().toString(36).toUpperCase().slice(2));
}

export default router;