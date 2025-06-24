const PatrolRoute = require('../models/PatrolRoute');
const User = require('../models/User');
const Patrol = require('../models/Patrol');
const Incident = require('../models/Incident');

/**
 * AI-powered patrol scheduling service for Ahmedabad district
 * Optimizes patrol assignments based on incidents, officer availability, and route efficiency
 */
class AIScheduler {
  constructor() {
    // Ahmedabad district boundaries
    this.ahmedabadBounds = {
      north: 24.0,
      south: 22.5,
      east: 73.0,
      west: 72.0
    };
    
    // Patrol scheduling factors and weights
    this.factors = {
      incidentPriority: 0.35,
      routeEfficiency: 0.25,
      officerWorkload: 0.20,
      timeOfDay: 0.15,
      historicalData: 0.05
    };

    // Time-based priority multipliers
    this.timeMultipliers = {
      night: 1.5,    // 10 PM - 6 AM
      evening: 1.2,  // 6 PM - 10 PM
      day: 1.0       // 6 AM - 6 PM
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get time-based priority multiplier
   */
  getTimeMultiplier(hour) {
    if (hour >= 22 || hour <= 6) {
      return this.timeMultipliers.night;
    } else if (hour >= 18 && hour < 22) {
      return this.timeMultipliers.evening;
    } else {
      return this.timeMultipliers.day;
    }
  }

  /**
   * Get incident priority score for a route
   */
  async getIncidentPriority(route) {
    try {
      // Find incidents near route checkpoints in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const nearbyIncidents = await Incident.find({
        createdAt: { $gte: twentyFourHoursAgo },
        status: { $in: ['open', 'in-progress'] }
      });

      let totalPriority = 0;
      let incidentCount = 0;

      for (const checkpoint of route.checkpoints) {
        for (const incident of nearbyIncidents) {
          const distance = this.calculateDistance(
            checkpoint.coordinates.latitude,
            checkpoint.coordinates.longitude,
            incident.coordinates?.latitude || 0,
            incident.coordinates?.longitude || 0
          );

          // Consider incidents within 2km of checkpoint
          if (distance <= 2) {
            const severityMultiplier = {
              'low': 1,
              'medium': 2,
              'high': 3,
              'critical': 4
            };
            
            totalPriority += severityMultiplier[incident.severity] || 1;
            incidentCount++;
          }
        }
      }

      return {
        priority: totalPriority,
        incidentCount,
        averagePriority: incidentCount > 0 ? totalPriority / incidentCount : 0
      };
    } catch (error) {
      console.error('Error calculating incident priority:', error);
      return { priority: 0, incidentCount: 0, averagePriority: 0 };
    }
  }

  /**
   * Calculate route efficiency score
   */
  calculateRouteEfficiency(route) {
    if (!route.checkpoints || route.checkpoints.length < 2) {
      return 0;
    }

    // Calculate total distance and checkpoint density
    let totalDistance = 0;
    for (let i = 1; i < route.checkpoints.length; i++) {
      const prev = route.checkpoints[i - 1];
      const curr = route.checkpoints[i];
      totalDistance += this.calculateDistance(
        prev.coordinates.latitude,
        prev.coordinates.longitude,
        curr.coordinates.latitude,
        curr.coordinates.longitude
      );
    }

    // Efficiency based on checkpoint density and route length
    const checkpointDensity = route.checkpoints.length / Math.max(totalDistance, 1);
    const estimatedDuration = route.estimatedDuration || (route.checkpoints.length * 15);
    
    return {
      distance: totalDistance,
      checkpointDensity,
      estimatedDuration,
      efficiency: checkpointDensity * (60 / Math.max(estimatedDuration, 1)) // checkpoints per hour
    };
  }

  /**
   * Get officer workload and availability
   */
  async getOfficerWorkload(officers, startTime, endTime) {
    try {
      const workloadData = [];

      for (const officer of officers) {
        // Count active patrols for this officer
        const activePatrols = await Patrol.countDocuments({
          assignedOfficers: officer._id,
          status: { $in: ['scheduled', 'in-progress'] },
          startTime: { $lte: endTime },
          endTime: { $gte: startTime }
        });

        // Count completed patrols in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentPatrols = await Patrol.countDocuments({
          assignedOfficers: officer._id,
          status: 'completed',
          createdAt: { $gte: sevenDaysAgo }
        });

        workloadData.push({
          officer,
          activePatrols,
          recentPatrols,
          workloadScore: activePatrols * 2 + recentPatrols * 0.1,
          availability: officer.status === 'active' ? 1 : 0.5
        });
      }

      return workloadData;
    } catch (error) {
      console.error('Error calculating officer workload:', error);
      return officers.map(officer => ({
        officer,
        activePatrols: 0,
        recentPatrols: 0,
        workloadScore: 0,
        availability: 1
      }));
    }
  }

  /**
   * Generate optimized patrol assignments
   */
  async generatePatrolAssignments(options = {}) {
    const {
      startTime = new Date(),
      endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000), // 8 hours
      availableOfficers = [],
      maxRoutes = 5
    } = options;

    try {
      // Get all active patrol routes
      let patrolRoutes = await PatrolRoute.find({
        isActive: true
      }).populate('createdBy', 'name');

      // Get all open/in-progress incidents
      const openIncidents = await Incident.find({
        status: { $in: ['new', 'in-progress'] }
      });

      // Get available officers if not provided
      let officers = availableOfficers;
      if (officers.length === 0) {
        officers = await User.find({
          role: 'officer',
          status: { $in: ['active', 'on-duty'] }
        }).select('name email status');
      }

      if (officers.length === 0) {
        throw new Error('No available officers found');
      }

      // For each incident, check if any route covers the area; if not, create a new route
      for (const incident of openIncidents) {
        const area = incident.area?.trim().toLowerCase();
        if (!area) continue;
        const routeCoversArea = patrolRoutes.some(route =>
          route.checkpoints.some(cp => cp.name.trim().toLowerCase() === area)
        );
        if (!routeCoversArea) {
          // Create a new route for this area
          const newRoute = await PatrolRoute.create({
            name: `Incident Response: ${incident.area}`,
            description: `Auto-generated route for incident at ${incident.area}`,
            checkpoints: [
              {
                name: incident.area,
                description: `Incident location: ${incident.area}`,
                coordinates: { latitude: 23.03, longitude: 72.58 }, // Placeholder, ideally geocode
                geofenceRadius: 50,
                estimatedTime: 10,
                order: 1,
                requirements: {},
                isActive: true
              }
            ],
            isActive: true,
            createdBy: officers[0]._id,
            notes: `Auto-created for incident: ${incident.title}`
          });
          patrolRoutes.push(newRoute);
        }
      }

      // Calculate scores for each route
      const routeScores = [];
      for (const route of patrolRoutes) {
        // Prioritize if any checkpoint matches an incident area
        const incidentMatch = openIncidents.find(inc =>
          route.checkpoints.some(cp => cp.name.trim().toLowerCase() === inc.area?.trim().toLowerCase())
        );
        const incidentPriority = incidentMatch ? { priority: 10, incidentCount: 1, averagePriority: 10 } : await this.getIncidentPriority(route);
        const efficiency = this.calculateRouteEfficiency(route);
        const timeMultiplier = this.getTimeMultiplier(startTime.getHours());

        const totalScore = (
          incidentPriority.priority * this.factors.incidentPriority +
          efficiency.efficiency * this.factors.routeEfficiency +
          timeMultiplier * this.factors.timeOfDay
        );

        routeScores.push({
          route,
          score: totalScore,
          incidentPriority,
          efficiency,
          timeMultiplier
        });
      }

      // Sort routes by score (highest first)
      routeScores.sort((a, b) => b.score - a.score);

      // Get officer workload data
      const officerWorkload = await this.getOfficerWorkload(officers, startTime, endTime);

      // Assign routes to officers using greedy algorithm (lowest workload first)
      const assignments = [];
      const assignedOfficers = new Set();

      for (const routeScore of routeScores.slice(0, maxRoutes)) {
        // Find best available officer for this route (lowest workload)
        let bestOfficer = null;
        let bestScore = -1;

        for (const workload of officerWorkload) {
          if (assignedOfficers.has(workload.officer._id.toString())) {
            continue;
          }

          // Calculate assignment score (prefer lowest workload)
          const assignmentScore = routeScore.score * workload.availability / (1 + workload.workloadScore);
          
          if (assignmentScore > bestScore) {
            bestScore = assignmentScore;
            bestOfficer = workload;
          }
        }

        if (bestOfficer) {
          assignments.push({
            route: routeScore.route,
            officer: bestOfficer.officer,
            score: bestScore,
            incidentPriority: routeScore.incidentPriority,
            efficiency: routeScore.efficiency,
            startTime,
            endTime
          });
          assignedOfficers.add(bestOfficer.officer._id.toString());
        }
      }

      return {
        success: true,
        data: {
          assignments,
          summary: {
            totalAssignments: assignments.length,
            totalRoutes: patrolRoutes.length,
            totalOfficers: officers.length,
            coverage: assignments.length / Math.min(patrolRoutes.length, maxRoutes) * 100,
            averageScore: assignments.length > 0 ? 
              assignments.reduce((sum, a) => sum + (a.score || 0), 0) / assignments.length : 0
          }
        }
      };

    } catch (error) {
      console.error('AI Scheduling error:', error);
      throw error;
    }
  }

  /**
   * Get scheduling recommendations
   */
  async getSchedulingRecommendations() {
    try {
      const recommendations = [];

      // Get current statistics
      const totalRoutes = await PatrolRoute.countDocuments({ isActive: true });
      const totalOfficers = await User.countDocuments({ role: 'officer', status: 'active' });
      const openIncidents = await Incident.countDocuments({ status: { $in: ['open', 'in-progress'] } });

      // Route coverage recommendation
      if (totalRoutes > totalOfficers * 2) {
        recommendations.push({
          type: 'coverage',
          priority: 'high',
          message: `Consider adding more officers. You have ${totalRoutes} routes but only ${totalOfficers} active officers.`,
          action: 'recruit_officers'
        });
      }

      // Incident response recommendation
      if (openIncidents > 0) {
        recommendations.push({
          type: 'incident_response',
          priority: 'high',
          message: `${openIncidents} open incidents detected. Prioritize routes near incident locations.`,
          action: 'prioritize_incident_routes'
        });
      }

      // Time-based recommendations
      const currentHour = new Date().getHours();
      if (currentHour >= 22 || currentHour <= 6) {
        recommendations.push({
          type: 'time_based',
          priority: 'medium',
          message: 'Night patrol hours. Increase patrol frequency for high-security areas.',
          action: 'increase_night_patrols'
        });
      }

      // Efficiency recommendations
      const lowEfficiencyRoutes = await PatrolRoute.find({
        isActive: true,
        'checkpoints.0': { $exists: true }
      }).then(routes => routes.filter(route => {
        const efficiency = this.calculateRouteEfficiency(route);
        return efficiency.efficiency < 0.5;
      }));

      if (lowEfficiencyRoutes.length > 0) {
        recommendations.push({
          type: 'efficiency',
          priority: 'medium',
          message: `${lowEfficiencyRoutes.length} routes have low efficiency. Consider optimizing checkpoint placement.`,
          action: 'optimize_routes'
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get real-time patrol optimization suggestions
   */
  async getOptimizationSuggestions() {
    try {
      const suggestions = [];

      // Get current active patrols
      const activePatrols = await Patrol.find({
        status: 'in-progress'
      }).populate('patrolRoute assignedOfficers');

      // Check for patrols near incidents
      const openIncidents = await Incident.find({
        status: { $in: ['open', 'in-progress'] }
      });

      for (const patrol of activePatrols) {
        for (const incident of openIncidents) {
          const distance = this.calculateDistance(
            patrol.patrolRoute.checkpoints[0].coordinates.latitude,
            patrol.patrolRoute.checkpoints[0].coordinates.longitude,
            incident.coordinates?.latitude || 0,
            incident.coordinates?.longitude || 0
          );

          if (distance <= 3) { // Within 3km
            suggestions.push({
              patrolId: patrol._id,
              incidentId: incident._id,
              type: 'incident_nearby',
              message: `Patrol ${patrol.title} is near incident ${incident.title}. Consider diverting to respond.`,
              priority: incident.severity === 'critical' ? 'high' : 'medium',
              distance
            });
          }
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting optimization suggestions:', error);
      return [];
    }
  }
}

module.exports = new AIScheduler(); 