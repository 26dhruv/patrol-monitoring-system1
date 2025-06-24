const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

// Get reports data
router.get('/', authenticateUser, reportController.getReports);

// Get report stats
router.get('/stats', authenticateUser, reportController.getReportStats);

// Download reports as CSV
router.get('/download', authenticateUser, reportController.downloadReport);

module.exports = router; 