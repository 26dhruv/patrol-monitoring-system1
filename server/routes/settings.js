const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

// Get user settings
router.get('/', authenticateUser, settingsController.getSettings);

// Update general settings
router.put('/general', authenticateUser, settingsController.updateGeneralSettings);

// Update admin settings (admin/manager only)
router.put('/admin', authenticateUser, authorizeRoles('admin', 'manager'), settingsController.updateAdminSettings);

module.exports = router; 