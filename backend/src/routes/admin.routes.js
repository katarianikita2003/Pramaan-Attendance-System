// backend/src/routes/admin.routes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { AdminController } from '../controllers/admin.controller.js';

const router = express.Router();
const adminController = new AdminController();

// All routes require authentication
router.use(authenticateToken);

// Dashboard routes
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard-stats', adminController.getDashboardStats);

// Scholar management routes
router.get('/scholars', adminController.getScholars);
router.post('/scholars', adminController.addScholar);
router.get('/scholars/:id', adminController.getScholarById);
router.put('/scholars/:id', adminController.updateScholar);
router.delete('/scholars/:id', adminController.deleteScholar);

// Reports routes
router.get('/reports', adminController.getReports);
router.get('/reports/attendance', adminController.getAttendanceReport);
router.get('/reports/export', adminController.exportReport);

// Analytics routes
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/trends', adminController.getAttendanceTrends);

// General stats
router.get('/stats', adminController.getStats);

export default router;