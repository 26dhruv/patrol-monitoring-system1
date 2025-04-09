const express = require('express');
const {
  getPatrols,
  getPatrol,
  createPatrol,
  updatePatrol,
  deletePatrol,
  startPatrol,
  getDashboardStats,
  getActivePatrols
} = require('../controllers/patrol');
const {
  createPatrolLog,
  getPatrolLogs
} = require('../controllers/patrolLog');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(authenticateUser);

// Dashboard routes
router.get('/dashboard-stats', getDashboardStats);
router.get('/active', getActivePatrols);

// Patrol routes
router.route('/')
  .get(getPatrols)
  .post(authorizeRoles('admin', 'manager'), createPatrol);

router.route('/:id')
  .get(getPatrol)
  .put(authorizeRoles('admin', 'manager'), updatePatrol)
  .delete(authorizeRoles('admin', 'manager'), deletePatrol);

// Start patrol route
router.put('/:id/start', startPatrol);

// Patrol logs routes
router.route('/:patrolId/logs')
  .get(getPatrolLogs)
  .post(createPatrolLog);

module.exports = router; 