const express = require('express');
const {
  getPatrols,
  getPatrol,
  createPatrol,
  updatePatrol,
  deletePatrol,
  startPatrol,
  getDashboardStats,
  getActivePatrols,
  trackPatrolLocation
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
router.get('/dashboard-stats', (req, res) => {
  // Pass user information as query parameters
  if (req.user) {
    req.query.userRole = req.user.role;
    req.query.userId = req.user.id || req.user._id;
  }
  
  // Call the controller function
  getDashboardStats(req, res);
});

router.get('/active', (req, res) => {
  // Pass user information as query parameters
  if (req.user) {
    req.query.userRole = req.user.role;
    req.query.userId = req.user.id || req.user._id;
  }
  
  // Call the controller function
  getActivePatrols(req, res);
});

// Get officer patrols
router.get('/officer/:officerId', async (req, res) => {
  try {
    console.log('Officer route called with officerId:', req.params.officerId);
    
    // Set the assignedOfficers parameter to filter patrols
    if (req.params.officerId) {
      // Convert to ObjectId if valid, otherwise use as string
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(req.params.officerId)) {
        console.log('Converting officerId to ObjectId:', req.params.officerId);
        req.query.assignedOfficers = new mongoose.Types.ObjectId(req.params.officerId);
      } else {
        console.log('Using officerId as string:', req.params.officerId);
        req.query.assignedOfficers = req.params.officerId;
      }
    }
    
    console.log('Modified query for getPatrols:', req.query);
    
    // Use the existing getPatrols controller
    await getPatrols(req, res);
  } catch (error) {
    console.error('Error in officer patrols route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching officer patrols', 
      error: error.message 
    });
  }
});

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

// Track officer location
router.post('/:id/track', trackPatrolLocation);

module.exports = router; 