// backend/src/routes/biometric.routes.js
import express from 'express';
import { enrollBiometric, checkEnrollment } from '../controllers/biometricController.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/enroll', authenticateToken, enrollBiometric);
router.get('/check-enrollment/:scholarId', authenticateToken, checkEnrollment);

export default router;