const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getOfficers,
  updateUserStatus
} = require('../controllers/user');
const { getUserLogs } = require('../controllers/patrolLog');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(authenticateUser);

// Admin & Manager only routes
router.get('/', authorizeRoles('admin', 'manager'), getUsers);
router.get('/officers', authorizeRoles('admin', 'manager'), getOfficers);

// Routes accessible to all authenticated users
router.get('/officers/available', getOfficers); // For incident assignment

// Routes for specific user
router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorizeRoles('admin'), deleteUser);

// User status routes
router.put('/:id/status', updateUserStatus);

// User logs routes
router.get('/:userId/logs', getUserLogs);

module.exports = router; 