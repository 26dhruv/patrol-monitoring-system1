const express = require('express');
const {
  getPatrolRoutes,
  getPatrolRoute,
  createPatrolRoute,
  updatePatrolRoute,
  deletePatrolRoute,
  getCheckpoint
} = require('../controllers/patrolRoute');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Route routes
router.route('/')
  .get(getPatrolRoutes)
  .post(createPatrolRoute);

router.route('/:id')
  .get(getPatrolRoute)
  .put(updatePatrolRoute)
  .delete(deletePatrolRoute);

// Checkpoint routes
router.route('/:id/checkpoints/:checkpointId')
  .get(getCheckpoint);

module.exports = router; 