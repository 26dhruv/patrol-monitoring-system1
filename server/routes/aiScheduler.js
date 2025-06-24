const express = require('express');
const {
  generatePatrolAssignments,
  getSchedulingRecommendations,
  getOptimizationSuggestions,
  getSchedulingStats,
  validateSchedulingParams
} = require('../controllers/aiSchedulerController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(authenticateUser);
router.use(authorizeRoles('admin', 'manager'));

// AI Scheduler routes
router.post('/generate-assignments', generatePatrolAssignments);
router.get('/recommendations', getSchedulingRecommendations);
router.get('/optimization-suggestions', getOptimizationSuggestions);
router.get('/stats', getSchedulingStats);
router.post('/validate', validateSchedulingParams);

module.exports = router; 