const express = require('express');
const {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/location');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(authenticateUser);

router.route('/')
  .get(getLocations)
  .post(authorizeRoles('admin', 'manager'), createLocation);

router.route('/:id')
  .get(getLocation)
  .put(authorizeRoles('admin', 'manager'), updateLocation)
  .delete(authorizeRoles('admin'), deleteLocation);

module.exports = router; 