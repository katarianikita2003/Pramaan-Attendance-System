// backend/src/routes/organization.routes.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import Admin from '../models/Admin.js';
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