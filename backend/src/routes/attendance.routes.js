// backend/src/routes/attendance.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
// Import enhanced controller
import enhancedAttendanceController from '../controllers/attendance.controller.enhanced.js';

const router = express.Router();

// Enhanced routes for attendance operations
// Note: The enhanced controller uses generateAttendanceProof instead of mark
router.post('/generate-proof', authenticateToken, authorizeRoles(['scholar']), enhancedAttendanceController.generateAttendanceProof);
router.get('/today-status', authenticateToken, enhancedAttendanceController.getTodayStatus);
router.get('/history', authenticateToken, enhancedAttendanceController.getAttendanceHistory);
router.post('/verify-qr', authenticateToken, authorizeRoles(['admin']), enhancedAttendanceController.verifyQRAttendance);

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