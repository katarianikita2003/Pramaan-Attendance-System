// ===== backend/src/routes/scholar.routes.js =====
import express from 'express';
import { body, validationResult } from 'express-validator';
import Scholar from '../models/Scholar.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { BiometricService } from '../services/biometric.service.js';
import { ZKPService } from '../services/zkp.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const biometricService = new BiometricService();
const zkpService = new ZKPService();

// Register new scholar
router.post('/register', 
  authenticateToken,
  requireRole('admin'),
  [
    body('scholarId').notEmpty().trim().toUpperCase(),
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('department').optional().trim(),
    body('biometricData').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { scholarId, name, email, department, biometricData } = req.body;
      const organizationId = req.user.organizationId;
      
      // Check if organization can add more scholars
      const organization = await Organization.findById(organizationId);
      if (!organization.canAddMoreScholars()) {
        return res.status(403).json({ 
          error: 'Scholar limit reached for your subscription plan' 
        });
      }
      
      // Check if scholar already exists
      const existingScholar = await Scholar.findOne({
        organizationId,
        $or: [{ scholarId }, { 'personalInfo.email': email }]
      });
      
      if (existingScholar) {
        return res.status(400).json({ error: 'Scholar already exists' });
      }
      
      // Validate biometric quality
      const qualityCheck = biometricService.validateBiometricQuality(biometricData);
      if (!qualityCheck.isValid) {
        return res.status(400).json({ 
          error: 'Biometric quality check failed',
          details: qualityCheck.errors
        });
      }
      
      // Generate global biometric hash
      const globalBiometricHash = await zkpService.generateGlobalBiometricHash(
        biometricData.fingerprint,
        biometricData.face
      );
      
      // Check global uniqueness
      const isDuplicate = await Scholar.exists({ 
        'biometricData.globalHash': globalBiometricHash 
      });
      
      if (isDuplicate) {
        return res.status(400).json({ 
          error: 'These biometrics are already registered in the system' 
        });
      }
      
      // Generate biometric commitments
      const commitment = await zkpService.generateBiometricCommitment(biometricData);
      
      // Encrypt salts
      const encryptedSalts = biometricService.encrypt({
        salt: commitment.salt
      });
      
      // Create scholar
      const scholar = new Scholar({
        organizationId,
        scholarId,
        personalInfo: {
          name,
          email,
          department
        },
        academicInfo: {
          department
        },
        biometricData: {
          enrollmentStatus: {
            fingerprint: true,
            face: true
          },
          commitments: {
            fingerprint: commitment.commitment,
            face: commitment.commitment,
            combined: commitment.commitment
          },
          salts: JSON.stringify(encryptedSalts),
          globalHash: globalBiometricHash,
          lastUpdated: new Date()
        },
        zkpData: {
          publicKey: crypto.randomBytes(32).toString('hex')
        }
      });
      
      await scholar.save();
      
      // Update organization stats
      organization.stats.totalScholars++;
      organization.stats.activeScholars++;
      await organization.save();
      
      // Send welcome email
      await emailService.sendWelcomeEmail(scholar, organization);
      
      logger.info(`Scholar registered: ${scholarId} in org ${organizationId}`);
      
      res.status(201).json({
        message: 'Scholar registered successfully',
        scholar: {
          id: scholar._id,
          scholarId: scholar.scholarId,
          name: scholar.personalInfo.name,
          email: scholar.personalInfo.email,
          zkpPublicKey: scholar.zkpData.publicKey
        }
      });
    } catch (error) {
      logger.error('Scholar registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Get scholar profile
router.get('/:id/profile', authenticateToken, async (req, res) => {
  try {
    const scholar = await Scholar.findById(req.params.id)
      .populate('organizationId', 'name code');
    
    if (!scholar) {
      return res.status(404).json({ error: 'Scholar not found' });
    }
    
    // Check access permissions
    if (req.user.role === 'scholar' && req.user.scholarId !== scholar._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.user.role === 'admin' && req.user.organizationId !== scholar.organizationId._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      scholar: {
        id: scholar._id,
        scholarId: scholar.scholarId,
        personalInfo: scholar.personalInfo,
        academicInfo: scholar.academicInfo,
        attendanceStats: scholar.attendanceStats,
        enrollmentStatus: scholar.biometricData.enrollmentStatus,
        organization: {
          name: scholar.organizationId.name,
          code: scholar.organizationId.code
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Enroll biometric
router.post('/:id/biometric/enroll', 
  authenticateToken,
  [
    body('type').isIn(['fingerprint', 'face']),
    body('biometricData').notEmpty()
  ],
  async (req, res) => {
    try {
      const { type, biometricData } = req.body;
      const scholarId = req.params.id;
      
      // Verify scholar owns this account
      if (req.user.scholarId !== scholarId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const scholar = await Scholar.findById(scholarId);
      if (!scholar) {
        return res.status(404).json({ error: 'Scholar not found' });
      }
      
      // Validate biometric quality
      const qualityCheck = biometricService.validateBiometricQuality({ [type]: biometricData });
      if (!qualityCheck.isValid) {
        return res.status(400).json({ 
          error: 'Biometric quality check failed',
          details: qualityCheck.errors
        });
      }
      
      // Update enrollment status
      scholar.biometricData.enrollmentStatus[type] = true;
      scholar.biometricData.lastUpdated = new Date();
      
      await scholar.save();
      
      res.json({
        message: `${type} enrolled successfully`,
        enrollmentStatus: scholar.biometricData.enrollmentStatus
      });
    } catch (error) {
      logger.error('Biometric enrollment error:', error);
      res.status(500).json({ error: 'Enrollment failed' });
    }
  }
);

export default router;