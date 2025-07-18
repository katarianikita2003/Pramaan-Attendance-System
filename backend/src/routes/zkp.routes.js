// backend/src/routes/zkp.routes.js
import express from 'express';
import path from 'path';
import zkpService from '../services/zkp.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/zkp/status
// @desc    Get ZKP service status
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    success: true,
    mode: zkpService.getMode(),
    ready: zkpService.isReady()
  });
});

// @route   POST /api/zkp/verify
// @desc    Verify ZKP proof
// @access  Public
router.post('/verify', async (req, res) => {
  try {
    const { proof, publicSignals, commitment } = req.body;
    
    const isValid = await zkpService.verifyAttendanceProof({
      proof,
      publicSignals,
      publicInputs: publicSignals, // Support both formats
      commitment,
    });

    res.json({
      success: true,
      valid: isValid,
      mode: zkpService.getMode()
    });
  } catch (error) {
    logger.error('ZKP verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Verification failed',
      message: error.message 
    });
  }
});

// @route   POST /api/zkp/check-uniqueness
// @desc    Check if biometric is unique
// @access  Public
router.post('/check-uniqueness', async (req, res) => {
  try {
    const { nullifier, type } = req.body;
    
    // In production, check against database for nullifier uniqueness
    // This prevents the same biometric from being registered twice
    
    // For now, always return true
    const isUnique = true;

    res.json({
      success: true,
      isUnique,
      mode: zkpService.getMode()
    });
  } catch (error) {
    logger.error('Uniqueness check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Uniqueness check failed' 
    });
  }
});

// Circuit file serving endpoints (for production mode)
// These files are needed by the mobile app to generate proofs

// @route   GET /api/zkp/biometric.wasm
// @desc    Serve WASM file for circuit
// @access  Public
router.get('/biometric.wasm', (req, res) => {
  try {
    const wasmPath = path.join(process.cwd(), 
      'zkp-circuits/build/biometric_attendance_js/biometric_attendance.wasm');
    
    res.setHeader('Content-Type', 'application/wasm');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.sendFile(wasmPath, (err) => {
      if (err) {
        logger.error('Error serving WASM file:', err);
        res.status(404).json({ error: 'WASM file not found. Run circuit setup first.' });
      }
    });
  } catch (error) {
    logger.error('Error serving WASM file:', error);
    res.status(500).json({ error: 'Failed to serve WASM file' });
  }
});

// @route   GET /api/zkp/biometric.zkey
// @desc    Serve proving key
// @access  Public
router.get('/biometric.zkey', (req, res) => {
  try {
    const zkeyPath = path.join(process.cwd(), 
      'zkp-circuits/keys/biometric_final.zkey');
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.sendFile(zkeyPath, (err) => {
      if (err) {
        logger.error('Error serving zkey file:', err);
        res.status(404).json({ error: 'Proving key not found. Run circuit setup first.' });
      }
    });
  } catch (error) {
    logger.error('Error serving zkey file:', error);
    res.status(500).json({ error: 'Failed to serve proving key' });
  }
});

// @route   GET /api/zkp/verification_key.json
// @desc    Serve verification key
// @access  Public
router.get('/verification_key.json', (req, res) => {
  try {
    const vkeyPath = path.join(process.cwd(), 
      'zkp-circuits/keys/verification_key.json');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.sendFile(vkeyPath, (err) => {
      if (err) {
        logger.error('Error serving verification key:', err);
        res.status(404).json({ error: 'Verification key not found. Run circuit setup first.' });
      }
    });
  } catch (error) {
    logger.error('Error serving verification key:', error);
    res.status(500).json({ error: 'Failed to serve verification key' });
  }
});

// @route   POST /api/zkp/generate-commitment
// @desc    Generate biometric commitment (for testing)
// @access  Private
router.post('/generate-commitment', async (req, res) => {
  try {
    const { biometricData } = req.body;
    
    if (!biometricData || !biometricData.type) {
      return res.status(400).json({
        success: false,
        error: 'Biometric data required'
      });
    }
    
    const commitment = await zkpService.generateBiometricCommitment(biometricData);
    
    res.json({
      success: true,
      commitment,
      mode: zkpService.getMode()
    });
  } catch (error) {
    logger.error('Commitment generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate commitment',
      message: error.message
    });
  }
});

export default router;