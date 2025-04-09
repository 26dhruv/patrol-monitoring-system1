const PatrolLog = require('../models/PatrolLog');
const Patrol = require('../models/Patrol');
const User = require('../models/User');

// @desc    Create a new patrol log entry
// @route   POST /api/patrol/:patrolId/logs
// @access  Private (Officers)
exports.createPatrolLog = async (req, res, next) => {
  try {
    req.body.patrol = req.params.patrolId;
    req.body.officer = req.user.userId;

    const patrol = await Patrol.findById(req.params.patrolId);

    if (!patrol) {
      return res.status(404).json({
        success: false,
        error: `Patrol not found with id of ${req.params.patrolId}`
      });
    }

    // Check if the current user is assigned to this patrol
    if (!patrol.assignedOfficers.includes(req.user.userId)) {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not assigned to this patrol`
      });
    }

    // Check if patrol is in progress
    if (patrol.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        error: 'Patrol is not in progress'
      });
    }

    const log = await PatrolLog.create(req.body);

    // Update user status if action is check-in
    if (req.body.action === 'check-in') {
      await User.findByIdAndUpdate(req.user.userId, { status: 'active' });
    }

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all logs for a patrol
// @route   GET /api/patrol/:patrolId/logs
// @access  Private
exports.getPatrolLogs = async (req, res, next) => {
  try {
    const logs = await PatrolLog.find({ patrol: req.params.patrolId })
      .populate({
        path: 'officer',
        select: 'name email badgeNumber'
      })
      .populate({
        path: 'location',
        select: 'name coordinates'
      })
      .sort('-timestamp');

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all logs for a user
// @route   GET /api/users/:userId/logs
// @access  Private (Admin, Manager, or the User themselves)
exports.getUserLogs = async (req, res, next) => {
  try {
    // Check if user exists
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.userId}`
      });
    }

    // Check authorization
    if (
      req.user.userId !== req.params.userId &&
      req.user.role !== 'admin' &&
      req.user.role !== 'manager'
    ) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access these logs'
      });
    }

    const logs = await PatrolLog.find({ officer: req.params.userId })
      .populate({
        path: 'patrol',
        select: 'title startTime endTime status'
      })
      .populate({
        path: 'location',
        select: 'name coordinates'
      })
      .sort('-timestamp');

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single log entry
// @route   GET /api/logs/:id
// @access  Private
exports.getLog = async (req, res, next) => {
  try {
    const log = await PatrolLog.findById(req.params.id)
      .populate({
        path: 'officer',
        select: 'name email badgeNumber'
      })
      .populate({
        path: 'patrol',
        select: 'title startTime endTime status'
      })
      .populate({
        path: 'location',
        select: 'name coordinates description'
      });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: `Log not found with id of ${req.params.id}`
      });
    }

    // Check authorization for non-admin/manager users
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'manager' &&
      log.officer._id.toString() !== req.user.userId
    ) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this log'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 