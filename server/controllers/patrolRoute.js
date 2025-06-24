const PatrolRoute = require('../models/PatrolRoute');
const Location = require('../models/Location');
const { BadRequestError } = require('../errors');

// @desc    Get all patrol routes
// @route   GET /api/patrol-routes
// @access  Private
exports.getPatrolRoutes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, difficulty, securityLevel, isActive } = req.query;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (difficulty) filter.difficulty = difficulty;
    if (securityLevel) filter.securityLevel = securityLevel;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const routes = await PatrolRoute.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PatrolRoute.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: routes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
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

// @desc    Get single patrol route
// @route   GET /api/patrol-routes/:id
// @access  Private
exports.getPatrolRoute = async (req, res, next) => {
  try {
    const route = await PatrolRoute.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Patrol route not found'
      });
    }

    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create patrol route
// @route   POST /api/patrol-routes
// @access  Private
exports.createPatrolRoute = async (req, res, next) => {
  try {
    const {
      name,
      description,
      fromLocation,
      toLocation,
      fromCoordinates,
      toCoordinates,
      difficulty = 'medium',
      securityLevel = 'medium',
      tags = [],
      notes = ''
    } = req.body;

    // Validate required fields
    if (!name || !fromLocation || !toLocation) {
      throw new BadRequestError('Name, from location, and to location are required');
    }

    if (!fromCoordinates || !toCoordinates) {
      throw new BadRequestError('Coordinates for both locations are required');
    }

    if (fromLocation === toLocation) {
      throw new BadRequestError('From and to locations cannot be the same');
    }

    // Check if route already exists
    const existingRoute = await PatrolRoute.findOne({
      $or: [
        { name: name },
        {
          'checkpoints.0.name': fromLocation,
          [`checkpoints.${1}.name`]: toLocation
        }
      ]
    });

    if (existingRoute) {
      throw new BadRequestError('A patrol route with this name or locations already exists');
    }

    // Calculate estimated duration based on distance
    const distance = calculateDistance(
      fromCoordinates.latitude,
      fromCoordinates.longitude,
      toCoordinates.latitude,
      toCoordinates.longitude
    );
    
    // Estimate 5 minutes per kilometer + 2 minutes for each checkpoint
    const estimatedDuration = Math.round((distance * 5) + 4);

    // Create checkpoints array
    const checkpoints = [
      {
        name: fromLocation,
        coordinates: fromCoordinates,
        order: 1,
        type: 'start'
      },
      {
        name: toLocation,
        coordinates: toCoordinates,
        order: 2,
        type: 'end'
      }
    ];

    const patrolRoute = new PatrolRoute({
      name,
      description,
      checkpoints,
      difficulty,
      securityLevel,
      tags,
      notes,
      estimatedDuration,
      distance: Math.round(distance * 1000), // Convert to meters
      createdBy: req.user.id
    });

    await patrolRoute.save();

    res.status(201).json({
      success: true,
      data: patrolRoute
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update patrol route
// @route   PUT /api/patrol-routes/:id
// @access  Private
exports.updatePatrolRoute = async (req, res, next) => {
  try {
    const {
      name,
      description,
      fromLocation,
      toLocation,
      fromCoordinates,
      toCoordinates,
      difficulty,
      securityLevel,
      tags,
      notes
    } = req.body;

    let route = await PatrolRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Patrol route not found'
      });
    }

    // Update fields if provided
    if (name) route.name = name;
    if (description !== undefined) route.description = description;
    if (difficulty) route.difficulty = difficulty;
    if (securityLevel) route.securityLevel = securityLevel;
    if (tags) route.tags = tags;
    if (notes !== undefined) route.notes = notes;

    // Update locations and coordinates if provided
    if (fromLocation && toLocation && fromCoordinates && toCoordinates) {
      if (fromLocation === toLocation) {
        throw new BadRequestError('From and to locations cannot be the same');
      }

      // Check if route already exists (excluding current route)
      const existingRoute = await PatrolRoute.findOne({
        _id: { $ne: req.params.id },
        $or: [
          { name: name || route.name },
          {
            'checkpoints.0.name': fromLocation,
            [`checkpoints.${1}.name`]: toLocation
          }
        ]
      });

      if (existingRoute) {
        throw new BadRequestError('A patrol route with this name or locations already exists');
      }

      // Calculate new duration and distance
      const distance = calculateDistance(
        fromCoordinates.latitude,
        fromCoordinates.longitude,
        toCoordinates.latitude,
        toCoordinates.longitude
      );
      
      const estimatedDuration = Math.round((distance * 5) + 4);

      // Update checkpoints
      route.checkpoints = [
        {
          name: fromLocation,
          coordinates: fromCoordinates,
          order: 1,
          type: 'start'
        },
        {
          name: toLocation,
          coordinates: toCoordinates,
          order: 2,
          type: 'end'
        }
      ];

      route.estimatedDuration = estimatedDuration;
      route.distance = Math.round(distance * 1000);
    }

    await route.save();

    res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete patrol route
// @route   DELETE /api/patrol-routes/:id
// @access  Private
exports.deletePatrolRoute = async (req, res, next) => {
  try {
    const route = await PatrolRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Patrol route not found'
      });
    }

    // Check if route is being used in any active patrols
    const Patrol = require('../models/Patrol');
    const activePatrols = await Patrol.find({
      patrolRoute: req.params.id,
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (activePatrols.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete route that is being used in active patrols'
      });
    }

    await route.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Patrol route deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get checkpoint by ID within a route
// @route   GET /api/patrol-routes/:id/checkpoints/:checkpointId
// @access  Private
exports.getCheckpoint = async (req, res, next) => {
  try {
    const route = await PatrolRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Patrol route not found'
      });
    }

    const checkpoint = route.checkpoints.find(
      cp => cp._id.toString() === req.params.checkpointId
    );

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found'
      });
    }

    res.status(200).json({
      success: true,
      data: checkpoint
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}; 