const express = require('express');
const router = express.Router();
const {
  getAllIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  addNote,
  addAction,
  assignIncident,
  updateStatus,
  getIncidentStats
} = require('../controllers/incidentController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Special routes that should come before the ID routes
// Stats route
router.get('/stats', (req, res) => {
  // Pass user information as query parameters
  if (req.user) {
    req.query.userRole = req.user.role;
    req.query.userId = req.user.userId;
  }
  
  // Call the controller function
  getIncidentStats(req, res);
});

// Main CRUD routes for collection
router.route('/')
  .get(getAllIncidents)
  .post(createIncident);

// Routes with ID parameter must come after special routes
router.route('/:id([0-9a-fA-F]{24})')  // Only match valid MongoDB ObjectIds
  .get(getIncident)
  .patch(updateIncident)
  .delete(authorizeRoles('admin', 'manager'), deleteIncident);

// Additional action routes
router.post('/:id([0-9a-fA-F]{24})/notes', addNote);
router.post('/:id([0-9a-fA-F]{24})/actions', addAction);
router.patch('/:id([0-9a-fA-F]{24})/assign', authorizeRoles('admin', 'manager'), assignIncident);
router.patch('/:id([0-9a-fA-F]{24})/status', updateStatus);

module.exports = router; 