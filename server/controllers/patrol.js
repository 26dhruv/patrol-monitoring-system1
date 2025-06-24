const Patrol = require('../models/Patrol');
const PatrolLog = require('../models/PatrolLog');
const User = require('../models/User');
const Location = require('../models/Location');
const mongoose = require('mongoose');

// @desc    Create a new patrol
// @route   POST /api/patrol
// @access  Private (Admin, Manager)
exports.createPatrol = async (req, res, next) => {
  try {
    // Add assignedBy as the current user
    req.body.assignedBy = req.user.userId;

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
      .populate('locations', 'name coordinates');

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
      .populate('locations', 'name coordinates');

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Get patrol logs
    const logs = await PatrolLog.find({ patrol: req.params.id })
      .populate('officer', 'name')
      .populate('location', 'name')
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

    // Make sure user is patrol creator or an admin
    if (patrol.assignedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not authorized to update this patrol`
      });
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
    const patrol = await Patrol.findById(req.params.id);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.id}`
      });
    }

    // Make sure user is patrol creator or an admin
    if (patrol.assignedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not authorized to delete this patrol`
      });
    }

    await patrol.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
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
      location: patrol.locations[0], // First location in the route
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
    const checkpointIndex = patrol.checkpoints.findIndex(
      cp => cp._id.toString() === req.params.checkpointId
    );

    if (checkpointIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found in this patrol'
      });
    }

    // Update the checkpoint status
    patrol.checkpoints[checkpointIndex].status = 'completed';
    patrol.checkpoints[checkpointIndex].actualTime = new Date();
    patrol.checkpoints[checkpointIndex].notes = req.body.notes || '';

    await patrol.save();

    // Create patrol log
    await PatrolLog.create({
      patrol: req.params.id,
      officer: req.user.userId,
      location: patrol.checkpoints[checkpointIndex].location,
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
      location: patrol.locations[patrol.locations.length - 1], // Last location in the route
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
    const totalLocations = await Location.countDocuments();
    
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
      .populate('locations', 'name')
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
      .populate('location', 'name coordinates')
      .select('location assignedOfficers status startTime');
    
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