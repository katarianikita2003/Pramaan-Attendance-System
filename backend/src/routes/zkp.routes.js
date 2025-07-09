// backend/src/routes/zkp.routes.js
import express from 'express';
import { ZKPService } from '../services/zkp.service.js';
import logger from '../utils/logger.js';

const router = express.Router();
const zkpService = new ZKPService();

// @route   POST /api/zkp/verify
// @desc    Verify ZKP proof
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { proof, publicSignals, commitment } = req.body;
    
    const isValid = await zkpService.verifyProof({
      proof,
      publicSignals,
      commitment,
    });

    res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    logger.error('ZKP verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Verification failed' 
    });
  }
});

// @route   POST /api/zkp/check-uniqueness
// @desc    Check if biometric is unique
// @access  Public
router.post('/check-uniqueness', async (req, res) => {
  try {
    const { commitment, type } = req.body;
    
    // In production, check against global biometric registry
    // For now, always return true
    const isUnique = true;

    res.json({
      success: true,
      isUnique,
    });
  } catch (error) {
    logger.error('Uniqueness check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Uniqueness check failed' 
    });
  }
});

export default router;