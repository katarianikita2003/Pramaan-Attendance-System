// backend/src/routes/biometric.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { 
  checkBiometricStatus, 
  enrollBiometric, 
  verifyBiometric 
} from '../controllers/biometricController.js';

const router = express.Router();

// All biometric routes require authentication
router.use(authenticateToken);

// Scholar routes
router.get('/status', authorizeRoles(['scholar']), checkBiometricStatus);
router.post('/enroll', authorizeRoles(['scholar']), enrollBiometric);
router.post('/verify', authorizeRoles(['scholar']), verifyBiometric);

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Biometric routes working' });
});

export default router;