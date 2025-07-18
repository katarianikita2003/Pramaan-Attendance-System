// backend/src/routes/attendance.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
// Import from the existing controller
import {
  markAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  verifyAttendanceProof,
  getAttendanceStats
} from '../controllers/attendanceController.js';
// Import enhanced controller with all its functions
import enhancedAttendanceController from '../controllers/attendance.controller.enhanced.js';

const router = express.Router();

// Keep existing routes working
router.post('/mark', authenticateToken, authorizeRoles(['scholar']), markAttendance);
router.get('/today', authenticateToken, authorizeRoles(['scholar']), getTodayAttendance);
router.get('/history', authenticateToken, authorizeRoles(['scholar']), getAttendanceHistory);
router.get('/stats', authenticateToken, authorizeRoles(['scholar']), getAttendanceStats);

// Add new enhanced routes
router.post('/generate-proof', authenticateToken, authorizeRoles(['scholar']), enhancedAttendanceController.generateAttendanceProof);
router.get('/today-status', authenticateToken, authorizeRoles(['scholar']), enhancedAttendanceController.getTodayStatus);
router.post('/verify-qr', authenticateToken, authorizeRoles(['admin']), enhancedAttendanceController.verifyQRAttendance);

// Public verification route - using the original controller
router.get('/verify/:proofId', verifyAttendanceProof);

// Admin routes
router.get('/organization/:organizationId', 
  authenticateToken, 
  authorizeRoles(['admin', 'super_admin']), 
  async (req, res) => {
    // Implementation for getting organization-wide attendance
    res.json({ success: true, attendance: [] });
  }
);

export default router;