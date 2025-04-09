const Patrol = require('../models/Patrol');
const PatrolLog = require('../models/PatrolLog');
const User = require('../models/User');
const Location = require('../models/Location');

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
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Patrol.find(JSON.parse(queryStr))
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
    const total = await Patrol.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const patrols = await query;

    // Pagination result
    const pagination = {};

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
      pagination,
      data: patrols
    });
  } catch (error) {
    console.error(error);
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
    // Get active patrols count
    const activePatrols = await Patrol.countDocuments({ status: 'in-progress' });
    
    // Get officers on duty count
    const officersOnDuty = await User.countDocuments({ 
      role: 'officer',
      status: 'on-duty'
    });
    
    // Get patrols today count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const patrolsToday = await Patrol.countDocuments({
      startTime: { $gte: today }
    });
    
    // Get total locations count
    const totalLocations = await Location.countDocuments();
    
    // Get recent patrols
    const recentPatrols = await Patrol.find()
      .populate('assignedOfficers', 'name')
      .populate('locations', 'name')
      .sort('-startTime')
      .limit(5);
    
    // Get officers list
    const officers = await User.find({ role: 'officer' })
      .select('name email status')
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        activePatrols,
        officersOnDuty,
        patrolsToday,
        totalLocations,
        recentPatrols,
        officers
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
    const activePatrols = await Patrol.find({ status: 'in-progress' })
      .populate('assignedOfficers', 'name')
      .populate('location', 'name coordinates')
      .select('location assignedOfficers status startTime');
    
    res.status(200).json({
      success: true,
      data: activePatrols
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 