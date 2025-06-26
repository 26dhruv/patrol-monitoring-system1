const Patrol = require('../models/Patrol');
const PatrolLog = require('../models/PatrolLog');
const User = require('../models/User');
const PatrolRoute = require('../models/PatrolRoute');
const PatrolStatusManager = require('../services/patrolStatusManager');
const mongoose = require('mongoose');

// Initialize patrol status manager
const patrolStatusManager = new PatrolStatusManager();

// @desc    Create a new patrol
// @route   POST /api/patrol
// @access  Private (Admin, Manager)
exports.createPatrol = async (req, res, next) => {
  try {
    // Add assignedBy as the current user
    req.body.assignedBy = req.user.userId;

    // Validate that the patrol route exists
    if (req.body.patrolRoute) {
      const route = await PatrolRoute.findById(req.body.patrolRoute);
      if (!route) {
        return res.status(400).json({
          success: false,
          error: 'Patrol route not found'
        });
      }

      // Initialize checkpoint progress based on the route
      req.body.checkpointProgress = route.checkpoints.map((checkpoint, index) => ({
        checkpointId: checkpoint._id.toString(),
        checkpointName: checkpoint.name,
        status: 'pending',
        order: checkpoint.order
      }));
    }

    // Check for time conflicts if assigned officers and times are provided
    if (req.body.assignedOfficers && req.body.startTime && req.body.endTime) {
      const conflicts = await patrolStatusManager.checkTimeConflicts(
        req.body.assignedOfficers,
        new Date(req.body.startTime),
        new Date(req.body.endTime)
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Time conflicts detected with existing patrols',
          conflicts: conflicts.map(conflict => ({
            officerName: conflict.officerName,
            overlappingPatrols: conflict.overlappingPatrols.map(p => ({
              title: p.title,
              startTime: p.startTime,
              endTime: p.endTime,
              routeName: p.routeName
            }))
          }))
        });
      }
    }

    const patrol = await Patrol.create(req.body);

    res.status(201).json({
      success: true,
      data: patrol
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all patrols
// @route   GET /api/patrol
// @access  Private
exports.getPatrols = async (req, res, next) => {
  try {
    console.log('getPatrols called with query:', req.query);
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Handle special case for assignedOfficers - improved handling
    if (reqQuery.assignedOfficers) {
      console.log('Found assignedOfficers in query:', reqQuery.assignedOfficers);
      
      try {
        // If it's a valid ObjectId, use it directly
        if (mongoose.Types.ObjectId.isValid(reqQuery.assignedOfficers)) {
          console.log('Using valid ObjectId for assignedOfficers:', reqQuery.assignedOfficers);
          reqQuery.assignedOfficers = new mongoose.Types.ObjectId(reqQuery.assignedOfficers);
        } else {
          console.log('assignedOfficers is not a valid ObjectId, using as string:', reqQuery.assignedOfficers);
        }
      } catch (err) {
        console.error('Error processing assignedOfficers parameter:', err);
        // If there's an error, keep the original value
      }
    }

    // If officerId is in the query, use it to filter by assignedOfficers
    if (reqQuery.officerId) {
      console.log('Found officerId in query, using as assignedOfficers:', reqQuery.officerId);
      
      try {
        // If it's a valid ObjectId, use it directly
        if (mongoose.Types.ObjectId.isValid(reqQuery.officerId)) {
          reqQuery.assignedOfficers = new mongoose.Types.ObjectId(reqQuery.officerId);
        } else {
          reqQuery.assignedOfficers = reqQuery.officerId;
        }
      } catch (err) {
        console.error('Error processing officerId parameter:', err);
        reqQuery.assignedOfficers = reqQuery.officerId;
      }
      
      delete reqQuery.officerId; // Remove the original parameter
    }

    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    console.log('Query string before conversion:', queryStr);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Parse the query
    const parsedQuery = JSON.parse(queryStr);
    console.log('Parsed query:', parsedQuery);

    // Finding resource
    query = Patrol.find(parsedQuery)
      .populate('assignedOfficers', 'name email badgeNumber')
      .populate('assignedBy', 'name email')
      .populate('patrolRoute', 'name description checkpoints');

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // Get total count of documents matching the query (before pagination)
    const total = await Patrol.countDocuments(parsedQuery);

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const patrols = await query;
    console.log(`Found ${patrols.length} patrols`);

    // Pagination result
    const pagination = {};
    pagination.totalPages = Math.ceil(total / limit);
    pagination.currentPage = page;

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: patrols.length,
      total,
      pagination,
      data: patrols
    });
  } catch (error) {
    console.error('Error in getPatrols:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single patrol
// @route   GET /api/patrol/:id
// @access  Private
exports.getPatrol = async (req, res, next) => {
  try {
    const patrol = await Patrol.findById(req.params.id)
      .populate('assignedOfficers', 'name email badgeNumber')
      .populate('assignedBy', 'name email')
      .populate('patrolRoute', 'name description checkpoints');

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Get patrol logs
    const logs = await PatrolLog.find({ patrol: req.params.id })
      .populate('officer', 'name')
      .sort('-timestamp');

    res.status(200).json({
      success: true,
      data: {
        patrol,
        logs
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update patrol
// @route   PUT /api/patrol/:id
// @access  Private (Admin, Manager)
exports.updatePatrol = async (req, res, next) => {
  try {
    let patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Make sure user is patrol creator, admin, or manager
    if (patrol.assignedBy && patrol.assignedBy.toString() !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not authorized to update this patrol`
      });
    }

    // Check for time conflicts if updating times or assigned officers
    if ((req.body.startTime || req.body.endTime || req.body.assignedOfficers) && 
        patrol.status === 'scheduled') {
      
      const startTime = req.body.startTime ? new Date(req.body.startTime) : patrol.startTime;
      const endTime = req.body.endTime ? new Date(req.body.endTime) : patrol.endTime;
      const assignedOfficers = req.body.assignedOfficers || patrol.assignedOfficers;

      const conflicts = await patrolStatusManager.checkTimeConflicts(
        assignedOfficers,
        startTime,
        endTime,
        req.params.id // Exclude current patrol
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Time conflicts detected with existing patrols',
          conflicts: conflicts.map(conflict => ({
            officerName: conflict.officerName,
            overlappingPatrols: conflict.overlappingPatrols.map(p => ({
              title: p.title,
              startTime: p.startTime,
              endTime: p.endTime,
              routeName: p.routeName
            }))
          }))
        });
      }
    }

    patrol = await Patrol.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: patrol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete patrol
// @route   DELETE /api/patrol/:id
// @access  Private (Admin, Manager)
exports.deletePatrol = async (req, res, next) => {
  try {
    console.log('Delete patrol request for ID:', req.params.id);
    console.log('User ID:', req.user.userId, 'Role:', req.user.role);
    
    const patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      console.log('Patrol not found');
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    console.log('Found patrol:', {
      id: patrol._id,
      assignedBy: patrol.assignedBy,
      title: patrol.title
    });

    // Make sure user is patrol creator, admin, or manager
    if (patrol.assignedBy && patrol.assignedBy.toString() !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      console.log('Authorization failed');
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not authorized to delete this patrol`
      });
    }

    console.log('Authorization passed, deleting patrol...');

    await Patrol.deleteOne({ _id: req.params.id });

    // Delete associated patrol logs
    console.log('Deleting associated patrol logs...');
    await PatrolLog.deleteMany({ patrol: req.params.id });

    console.log('Patrol and logs deleted successfully');

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error in deletePatrol:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Start patrol
// @route   PUT /api/patrol/:id/start
// @access  Private (Officer)
exports.startPatrol = async (req, res, next) => {
  try {
    const patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Check if the current user is assigned to this patrol
    if (!patrol.assignedOfficers.includes(req.user.userId)) {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not assigned to this patrol`
      });
    }

    // Update patrol status
    patrol.status = 'in-progress';
    await patrol.save();

    // Update officer status
    await User.findByIdAndUpdate(req.user.userId, { status: 'on-duty' });

    // Create patrol log
    await PatrolLog.create({
      patrol: req.params.id,
      officer: req.user.userId,
      location: patrol.patrolRoute.checkpoints[0], // First checkpoint in the route
      action: 'check-in',
      description: 'Patrol started',
      coordinates: req.body.coordinates
    });

    res.status(200).json({
      success: true,
      data: patrol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get officers assigned to a patrol
// @route   GET /api/patrol/:id/officers
// @access  Private
exports.getPatrolOfficers = async (req, res, next) => {
  try {
    const patrol = await Patrol.findById(req.params.id)
      .populate('assignedOfficers', 'name email badgeNumber status lastLocation');

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: patrol.assignedOfficers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Complete a checkpoint in a patrol
// @route   POST /api/patrol/:id/checkpoint/:checkpointId
// @access  Private (Officer)
exports.completeCheckpoint = async (req, res, next) => {
  try {
    const patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Check if the current user is assigned to this patrol
    if (!patrol.assignedOfficers.includes(req.user.userId)) {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not assigned to this patrol`
      });
    }

    // Find the checkpoint in the patrol
    const checkpointIndex = patrol.checkpointProgress.findIndex(
      cp => cp.checkpointId === req.params.checkpointId
    );

    if (checkpointIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found in this patrol'
      });
    }

    // Update the checkpoint status
    patrol.checkpointProgress[checkpointIndex].status = 'completed';
    patrol.checkpointProgress[checkpointIndex].actualTime = new Date();
    patrol.checkpointProgress[checkpointIndex].notes = req.body.notes || '';

    await patrol.save();

    // Create patrol log
    await PatrolLog.create({
      patrol: req.params.id,
      officer: req.user.userId,
      location: patrol.patrolRoute.checkpoints[checkpointIndex],
      action: 'check-in',
      description: req.body.notes || 'Checkpoint completed',
      coordinates: req.body.coordinates
    });

    res.status(200).json({
      success: true,
      data: patrol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Complete a patrol
// @route   PUT /api/patrol/:id/complete
// @access  Private (Officer)
exports.completePatrol = async (req, res, next) => {
  try {
    const patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Check if the current user is assigned to this patrol
    if (!patrol.assignedOfficers.includes(req.user.userId)) {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not assigned to this patrol`
      });
    }

    // Update patrol status
    patrol.status = 'completed';
    patrol.endTime = new Date();
    await patrol.save();

    // Create patrol log
    await PatrolLog.create({
      patrol: req.params.id,
      officer: req.user.userId,
      location: patrol.patrolRoute.checkpoints[patrol.patrolRoute.checkpoints.length - 1], // Last checkpoint in the route
      action: 'check-out',
      description: req.body.notes || 'Patrol completed',
      coordinates: req.body.coordinates
    });

    // Update officer status
    await User.findByIdAndUpdate(req.user.userId, { status: 'available' });

    res.status(200).json({
      success: true,
      data: patrol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/patrol/dashboard-stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Extract user role and ID from query parameters
    const userRole = req.query.userRole;
    const userId = req.query.userId;
    
    // Get active patrols count - filter by role
    let activePatrols;
    if (userRole === 'officer') {
      // Officer: only their assigned patrols
      activePatrols = await Patrol.countDocuments({ 
        status: 'in-progress',
        assignedOfficers: userId
      });
    } else if (userRole === 'manager') {
      // Manager: patrols assigned by them or all patrols (since no assignedBy field for officers yet)
      activePatrols = await Patrol.countDocuments({ 
        status: 'in-progress',
        $or: [
          { assignedBy: userId },
          { assignedBy: { $exists: false } } // Include patrols without assignedBy for now
        ]
      });
    } else {
      // Admin: all active patrols
      activePatrols = await Patrol.countDocuments({ status: 'in-progress' });
    }
    
    // Get officers on duty count - filter by role
    let officersOnDuty;
    if (userRole === 'officer') {
      // Officer: just their own status
      const user = await User.findById(userId);
      officersOnDuty = user?.status === 'on-duty' ? 1 : 0;
    } else if (userRole === 'manager') {
      // Manager: all officers on duty (since no assignedBy field for officers yet)
      officersOnDuty = await User.countDocuments({ 
        role: 'officer',
        status: 'on-duty'
      });
    } else {
      // Admin: all officers on duty
      officersOnDuty = await User.countDocuments({ 
        role: 'officer',
        status: 'on-duty'
      });
    }
    
    // Get patrols today count - filter by role
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let patrolsToday;
    if (userRole === 'officer') {
      patrolsToday = await Patrol.countDocuments({
        startTime: { $gte: today },
        assignedOfficers: userId
      });
    } else if (userRole === 'manager') {
      patrolsToday = await Patrol.countDocuments({
        startTime: { $gte: today },
        $or: [
          { assignedBy: userId },
          { assignedBy: { $exists: false } } // Include patrols without assignedBy for now
        ]
      });
    } else {
      patrolsToday = await Patrol.countDocuments({
        startTime: { $gte: today }
      });
    }
    
    // Get total locations count - same for all roles
    const totalLocations = await PatrolRoute.countDocuments();
    
    // Get completed patrols count - filter by role
    let completedPatrols;
    if (userRole === 'officer') {
      completedPatrols = await Patrol.countDocuments({
        status: 'completed',
        assignedOfficers: userId
      });
    } else if (userRole === 'manager') {
      completedPatrols = await Patrol.countDocuments({
        status: 'completed',
        $or: [
          { assignedBy: userId },
          { assignedBy: { $exists: false } } // Include patrols without assignedBy for now
        ]
      });
    } else {
      completedPatrols = await Patrol.countDocuments({
        status: 'completed'
      });
    }
    
    // Get recent patrols - filter by role
    let recentPatrolsQuery = Patrol.find();
    if (userRole === 'officer') {
      recentPatrolsQuery = recentPatrolsQuery.find({ assignedOfficers: userId });
    } else if (userRole === 'manager') {
      recentPatrolsQuery = recentPatrolsQuery.find({
        $or: [
          { assignedBy: userId },
          { assignedBy: { $exists: false } } // Include patrols without assignedBy for now
        ]
      });
    }
    
    const recentPatrols = await recentPatrolsQuery
      .populate('assignedOfficers', 'name')
      .populate('patrolRoute', 'name')
      .sort('-startTime')
      .limit(5);
    
    // Get officers list - filter by role
    let officers;
    if (userRole === 'officer') {
      // Officer: just their own info
      const user = await User.findById(userId).select('name email status');
      officers = user ? [user] : [];
    } else if (userRole === 'manager') {
      // Manager: all officers (since no assignedBy field for officers yet)
      officers = await User.find({ role: 'officer' })
        .select('name email status')
        .limit(5);
    } else {
      // Admin: all officers
      officers = await User.find({ role: 'officer' })
        .select('name email status')
        .limit(5);
    }
    
    // Get total patrols count - filter by role
    let totalPatrols;
    if (userRole === 'officer') {
      totalPatrols = await Patrol.countDocuments({ assignedOfficers: userId });
    } else if (userRole === 'manager') {
      totalPatrols = await Patrol.countDocuments({
        $or: [
          { assignedBy: userId },
          { assignedBy: { $exists: false } } // Include patrols without assignedBy for now
        ]
      });
    } else {
      totalPatrols = await Patrol.countDocuments();
    }
    
    res.status(200).json({
      success: true,
      data: {
        activePatrols,
        officersOnDuty,
        patrolsToday,
        totalLocations,
        completedPatrols,
        totalPatrols,
        recentPatrols,
        officers,
        userRole // Include user role for frontend to use
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

// @desc    Get active patrols
// @route   GET /api/patrol/active
// @access  Private
exports.getActivePatrols = async (req, res, next) => {
  try {
    // Extract user role and ID from query parameters or request user
    const userRole = req.query.userRole || req.user.role;
    const userId = req.query.userId || req.user.id || req.user._id;
    
    let query = { status: 'in-progress' };
    
    // If user is an officer, only show their assigned patrols
    if (userRole === 'officer') {
      query.assignedOfficers = userId;
    }
    
    const activePatrols = await Patrol.find(query)
      .populate('assignedOfficers', 'name')
      .populate('patrolRoute', 'name')
      .select('patrolRoute assignedOfficers status startTime');
    
    res.status(200).json({
      success: true,
      data: activePatrols
    });
  } catch (error) {
    console.error('Error fetching active patrols:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Track officer location and auto-complete when near destination
// @route   GET /api/patrol/:id/track
// @access  Private (Officer assigned to patrol)
exports.trackPatrolLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;
    const patrolId = req.params.id;
    const userId = req.user.userId.toString(); // Convert to string

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Latitude and longitude are required as query parameters.' 
      });
    }

    // Find patrol and check if officer is assigned
    const patrol = await Patrol.findById(patrolId).populate('patrolRoute');
    if (!patrol) {
      return res.status(404).json({ success: false, error: 'Patrol not found.' });
    }

    const assignedOfficerIds = patrol.assignedOfficers.map(id => id.toString());
    const isAssigned = assignedOfficerIds.includes(userId);

    if (!isAssigned) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this patrol.' });
    }

    // Append location to patrolPath
    patrol.patrolPath.push({ 
      latitude: parseFloat(latitude), 
      longitude: parseFloat(longitude), 
      timestamp: new Date() 
    });

    // Check if user is near destination (last checkpoint)
    if (patrol.patrolRoute && patrol.patrolRoute.checkpoints && patrol.patrolRoute.checkpoints.length > 0) {
      const destination = patrol.patrolRoute.checkpoints[patrol.patrolRoute.checkpoints.length - 1];
      const destLat = destination.coordinates.latitude;
      const destLng = destination.coordinates.longitude;
      const geofenceRadius = destination.geofenceRadius || 50; // Default 50 meters

      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        parseFloat(latitude), 
        parseFloat(longitude), 
        destLat, 
        destLng
      );

      // Check if user is within geofence radius
      if (distance <= geofenceRadius) {
        // User reached destination - complete patrol
        patrol.status = 'completed';
        patrol.actualEndTime = new Date();
        await patrol.save();

        return res.status(200).json({ 
          success: true, 
          message: 'Destination reached. Patrol completed.',
          data: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            timestamp: new Date(),
            isNearDestination: true,
            distance: Math.round(distance),
            geofenceRadius,
            shouldStopTracking: true,
            patrolCompleted: true
          }
        });
      }
    }

    // User not near destination - continue tracking
    await patrol.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Location tracked.',
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date(),
        isNearDestination: false,
        shouldStopTracking: false,
        patrolCompleted: false
      }
    });
  } catch (error) {
    console.error('Error tracking patrol location:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// @desc    Update patrol status
// @route   PATCH /api/patrol/:id/status
// @access  Private
exports.updatePatrolStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Check if user is authorized to update this patrol
    const isAssignedOfficer = patrol.assignedOfficers.includes(req.user.userId);
    const isCreator = patrol.assignedBy && patrol.assignedBy.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager';

    if (!isAssignedOfficer && !isCreator && !isAdmin && !isManager) {
      return res.status(401).json({
        success: false,
        error: 'You are not authorized to update this patrol'
      });
    }

    // Validate status transition
    const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: scheduled, in-progress, completed, cancelled'
      });
    }

    // Update the patrol status
    patrol.status = status;
    
    // Set end time if completing the patrol
    if (status === 'completed' && !patrol.endTime) {
      patrol.endTime = new Date();
    }

    await patrol.save();

    res.status(200).json({
      success: true,
      data: patrol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 