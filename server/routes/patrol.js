const express = require('express');
const {
  getPatrols,
  getPatrol,
  createPatrol,
  updatePatrol,
  deletePatrol,
  startPatrol,
  completePatrol,
  getPatrolOfficers,
  getDashboardStats,
  getActivePatrols,
  completeCheckpoint,
  trackPatrolLocation,
  updatePatrolStatus
} = require('../controllers/patrol');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const PatrolStatusManager = require('../services/patrolStatusManager');

const router = express.Router();
const patrolStatusManager = new PatrolStatusManager();

// Protect all routes
router.use(authenticateUser);

// Public routes (for authenticated users) - STATIC ROUTES FIRST
router.get('/', getPatrols);
router.get('/dashboard-stats', getDashboardStats);
router.get('/active', getActivePatrols);

// Availability checking routes - STATIC ROUTES FIRST
router.get('/availability/check', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time and end time are required'
      });
    }

    const availability = await patrolStatusManager.getAllOfficersAvailability(
      new Date(startTime),
      new Date(endTime)
    );

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

router.get('/availability/officer/:officerId', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    const { officerId } = req.params;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time and end time are required'
      });
    }

    const availability = await patrolStatusManager.getOfficerAvailability(
      officerId,
      new Date(startTime),
      new Date(endTime)
    );

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking officer availability:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

router.post('/conflicts/check', async (req, res) => {
  try {
    const { officerIds, startTime, endTime, excludePatrolId } = req.body;
    
    if (!officerIds || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Officer IDs, start time, and end time are required'
      });
    }

    const conflicts = await patrolStatusManager.checkTimeConflicts(
      officerIds,
      new Date(startTime),
      new Date(endTime),
      excludePatrolId
    );

    res.status(200).json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts
      }
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Admin/Manager routes - STATIC ROUTES FIRST
router.post('/', authorizeRoles('admin', 'manager'), createPatrol);

// DYNAMIC ROUTES LAST - These must come after all static routes
router.get('/:id', getPatrol);
router.get('/:id/officers', getPatrolOfficers);
router.put('/:id/start', authorizeRoles('officer'), startPatrol);
router.put('/:id/complete', authorizeRoles('officer'), completePatrol);
router.post('/:id/checkpoint/:checkpointId', authorizeRoles('officer'), completeCheckpoint);
router.patch('/:id/status', updatePatrolStatus);
router.put('/:id', authorizeRoles('admin', 'manager'), updatePatrol);
router.delete('/:id', authorizeRoles('admin', 'manager'), deletePatrol);
router.post('/:id/track', trackPatrolLocation);

module.exports = router; 