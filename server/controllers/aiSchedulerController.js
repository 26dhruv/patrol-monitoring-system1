const aiScheduler = require('../services/aiScheduler');
const Patrol = require('../models/Patrol');
const PatrolRoute = require('../models/PatrolRoute');

// @desc    Generate AI-powered patrol assignments
// @route   POST /api/ai-scheduler/generate-assignments
// @access  Private (Admin, Manager)
exports.generatePatrolAssignments = async (req, res, next) => {
  try {
    const {
      startTime,
      endTime,
      availableOfficers = [],
      maxRoutes = 5,
      autoCreate = false,
      createMissingRoutes = false
    } = req.body;

    // Validate inputs
    if (maxRoutes < 1 || maxRoutes > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum routes must be between 1 and 10'
      });
    }

    // Parse dates
    const startDate = startTime ? new Date(startTime) : new Date();
    const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 8 * 60 * 60 * 1000);

    // Generate assignments
    const result = await aiScheduler.generatePatrolAssignments({
      startTime: startDate,
      endTime: endDate,
      availableOfficers,
      maxRoutes,
      createMissingRoutes
    });

    // If autoCreate is true, create the patrols in the database
    if (autoCreate && result.data.assignments.length > 0) {
      const createdPatrols = [];
      
      // Group assignments by route to avoid duplicate patrols for the same route
      const patrolsByRoute = new Map();
      
      for (const assignment of result.data.assignments) {
        const routeId = assignment.route._id.toString();
        
        if (!patrolsByRoute.has(routeId)) {
          // Create new patrol for this route
          patrolsByRoute.set(routeId, {
            route: assignment.route,
            officers: [assignment.officer],
            assignments: [assignment],
            startTime: assignment.startTime,
            endTime: assignment.endTime,
            maxScore: assignment.score,
            totalIncidents: assignment.incidentPriority.incidentCount,
            efficiency: assignment.efficiency
          });
        } else {
          // Add officer to existing patrol
          const patrol = patrolsByRoute.get(routeId);
          patrol.officers.push(assignment.officer);
          patrol.assignments.push(assignment);
          patrol.maxScore = Math.max(patrol.maxScore, assignment.score);
          patrol.totalIncidents += assignment.incidentPriority.incidentCount;
        }
      }
      
      // Create patrols in database
      for (const [routeId, patrolData] of patrolsByRoute) {
        try {
          const officerNames = patrolData.officers.map(o => o.name).join(', ');
          const isCoordinatedPatrol = patrolData.officers.length > 1;
          
          const patrol = await Patrol.create({
            title: `AI Patrol - ${patrolData.route.name}${isCoordinatedPatrol ? ' (Team Patrol)' : ''}`,
            description: `AI-generated patrol assignment for ${patrolData.route.name}. Priority score: ${patrolData.maxScore.toFixed(2)}. ${isCoordinatedPatrol ? `Coordinated team patrol with ${patrolData.officers.length} officers: ${officerNames}` : `Assigned to: ${officerNames}`}`,
            assignedOfficers: patrolData.officers.map(o => o._id),
            assignedBy: req.user.userId,
            patrolRoute: patrolData.route._id,
            startTime: patrolData.startTime,
            endTime: patrolData.endTime,
            status: 'scheduled',
            priority: patrolData.totalIncidents > 0 ? 'high' : 'medium',
            notes: `Officers: ${officerNames}. Incidents nearby: ${patrolData.totalIncidents}, Route efficiency: ${patrolData.efficiency.efficiency.toFixed(2)}${isCoordinatedPatrol ? '. Team patrol for enhanced coverage.' : ''}`
          });
          createdPatrols.push(patrol);
        } catch (error) {
          console.error('Error creating patrol:', error);
        }
      }

      result.data.createdPatrols = createdPatrols;
      result.data.createdCount = createdPatrols.length;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('AI Scheduler error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate patrol assignments'
    });
  }
};

// @desc    Get AI scheduling recommendations
// @route   GET /api/ai-scheduler/recommendations
// @access  Private (Admin, Manager)
exports.getSchedulingRecommendations = async (req, res, next) => {
  try {
    const recommendations = await aiScheduler.getSchedulingRecommendations();

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('AI Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scheduling recommendations'
    });
  }
};

// @desc    Get real-time optimization suggestions
// @route   GET /api/ai-scheduler/optimization-suggestions
// @access  Private (Admin, Manager)
exports.getOptimizationSuggestions = async (req, res, next) => {
  try {
    const suggestions = await aiScheduler.getOptimizationSuggestions();

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('AI Optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get optimization suggestions'
    });
  }
};

// @desc    Get AI scheduling statistics
// @route   GET /api/ai-scheduler/stats
// @access  Private (Admin, Manager)
exports.getSchedulingStats = async (req, res, next) => {
  try {
    // Get statistics about existing patrols and routes
    const totalPatrols = await Patrol.countDocuments();
    const activePatrols = await Patrol.countDocuments({ status: 'in-progress' });
    const completedPatrols = await Patrol.countDocuments({ status: 'completed' });

    // Get route statistics
    const totalRoutes = await PatrolRoute.countDocuments({ isActive: true });
    const routesWithCheckpoints = await PatrolRoute.countDocuments({ 
      isActive: true, 
      'checkpoints.0': { $exists: true }
    });

    // Get officer statistics
    const User = require('../models/User');
    const totalOfficers = await User.countDocuments({ role: 'officer' });
    const availableOfficers = await User.countDocuments({ 
      role: 'officer', 
      status: { $in: ['active', 'on-duty'] } 
    });

    // Get incident statistics
    const Incident = require('../models/Incident');
    const totalIncidents = await Incident.countDocuments();
    const openIncidents = await Incident.countDocuments({ status: { $in: ['reported', 'investigating'] } });

    const stats = {
      patrols: {
        total: totalPatrols,
        active: activePatrols,
        completed: completedPatrols,
        completionRate: totalPatrols > 0 ? (completedPatrols / totalPatrols * 100).toFixed(1) : 0
      },
      routes: {
        total: totalRoutes,
        withCheckpoints: routesWithCheckpoints,
        coveragePercentage: totalRoutes > 0 ? (routesWithCheckpoints / totalRoutes * 100).toFixed(1) : 0
      },
      officers: {
        total: totalOfficers,
        available: availableOfficers,
        availabilityRate: totalOfficers > 0 ? (availableOfficers / totalOfficers * 100).toFixed(1) : 0
      },
      incidents: {
        total: totalIncidents,
        open: openIncidents,
        responseRate: totalIncidents > 0 ? ((totalIncidents - openIncidents) / totalIncidents * 100).toFixed(1) : 0
      },
      recommendations: {
        optimalRoutes: Math.min(5, Math.ceil(totalRoutes / 2)),
        maxRoutes: Math.min(10, totalRoutes),
        estimatedDuration: totalRoutes * 30 // 30 minutes per route
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('AI Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get scheduling statistics'
    });
  }
};

// @desc    Validate AI scheduling parameters
// @route   POST /api/ai-scheduler/validate
// @access  Private (Admin, Manager)
exports.validateSchedulingParams = async (req, res, next) => {
  try {
    const { maxRoutes, startTime, endTime } = req.body;

    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate number of routes
    if (!maxRoutes || maxRoutes < 1 || maxRoutes > 10) {
      validation.isValid = false;
      validation.errors.push('Maximum routes must be between 1 and 10');
    }

    // Validate dates
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        validation.isValid = false;
        validation.errors.push('End time must be after start time');
      }

      if (end - start > 24 * 60 * 60 * 1000) {
        validation.warnings.push('Patrol duration exceeds 24 hours');
      }
    }

    // Check resource availability
    const totalRoutes = await PatrolRoute.countDocuments({ isActive: true });
    const User = require('../models/User');
    const availableOfficers = await User.countDocuments({ 
      role: 'officer', 
      status: { $in: ['active', 'on-duty'] } 
    });

    if (maxRoutes > totalRoutes) {
      validation.warnings.push(`Requested ${maxRoutes} routes but only ${totalRoutes} available`);
    }

    if (maxRoutes > availableOfficers) {
      validation.warnings.push(`Requested ${maxRoutes} routes but only ${availableOfficers} officers available`);
    }

    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('AI Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate scheduling parameters'
    });
  }
}; 