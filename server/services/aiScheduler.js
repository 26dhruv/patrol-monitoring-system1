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
        status: { $in: ['reported', 'investigating'] }
      });

      let totalPriority = 0;
      let incidentCount = 0;

      for (const checkpoint of route.checkpoints) {
        for (const incident of nearbyIncidents) {
          let distance = Infinity;
          
          // Use coordinates if available, otherwise use area-based matching
          if (incident.coordinates?.latitude && incident.coordinates?.longitude) {
            distance = this.calculateDistance(
              checkpoint.coordinates.latitude,
              checkpoint.coordinates.longitude,
              incident.coordinates.latitude,
              incident.coordinates.longitude
            );
          } else if (incident.area) {
            // If no coordinates, check if checkpoint name matches incident area
            if (checkpoint.name.toLowerCase().includes(incident.area.toLowerCase()) ||
                incident.area.toLowerCase().includes(checkpoint.name.toLowerCase())) {
              distance = 0; // Consider it a match
            }
          }

          // Consider incidents within 2km of checkpoint
          if (distance <= 2) {
            const severityMultiplier = {
              'low': 1,
              'medium': 2,
              'high': 3,
              'critical': 4
            };
            
            const statusMultiplier = {
              'reported': 1.5,
              'investigating': 2.0,
              'resolved': 0.5,
              'closed': 0.1
            };
            
            const basePriority = severityMultiplier[incident.severity] || 1;
            const statusPriority = statusMultiplier[incident.status] || 1;
            
            totalPriority += basePriority * statusPriority;
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
      return {
        distance: 0,
        checkpointDensity: 0,
        estimatedDuration: 15,
        efficiency: 0
      };
    }

    // Calculate total distance and checkpoint density
    let totalDistance = 0;
    for (let i = 1; i < route.checkpoints.length; i++) {
      const prev = route.checkpoints[i - 1];
      const curr = route.checkpoints[i];
      
      // Ensure coordinates exist
      if (prev.coordinates?.latitude && prev.coordinates?.longitude && 
          curr.coordinates?.latitude && curr.coordinates?.longitude) {
        totalDistance += this.calculateDistance(
          prev.coordinates.latitude,
          prev.coordinates.longitude,
          curr.coordinates.latitude,
          curr.coordinates.longitude
        );
      }
    }

    // Efficiency based on checkpoint density and route length
    const checkpointDensity = route.checkpoints.length / Math.max(totalDistance, 1);
    const estimatedDuration = route.estimatedDuration || (route.checkpoints.length * 15);
    
    // Ensure efficiency is a valid number
    const efficiency = isNaN(checkpointDensity) ? 0 : checkpointDensity * (60 / Math.max(estimatedDuration, 1));
    
    return {
      distance: totalDistance || 0,
      checkpointDensity: checkpointDensity || 0,
      estimatedDuration: estimatedDuration || 15,
      efficiency: efficiency || 0
    };
  }

  /**
   * Get officer workload and availability
   */
  async getOfficerWorkload(officers, startTime, endTime) {
    try {
      const workloadData = [];

      for (const officer of officers) {
        // Get all patrols for this officer that overlap with the requested time period
        const overlappingPatrols = await Patrol.find({
          assignedOfficers: officer._id,
          status: { $in: ['scheduled', 'in-progress'] },
          $or: [
            // Patrol starts during the requested period
            { startTime: { $gte: startTime, $lt: endTime } },
            // Patrol ends during the requested period
            { endTime: { $gt: startTime, $lte: endTime } },
            // Patrol completely encompasses the requested period
            { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
          ]
        }).populate('patrolRoute', 'name');

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

        // Calculate available time slots
        const availableTimeSlots = this.calculateAvailableTimeSlots(startTime, endTime, overlappingPatrols);

        workloadData.push({
          officer,
          activePatrols,
          recentPatrols,
          overlappingPatrols,
          availableTimeSlots,
          workloadScore: activePatrols * 2 + recentPatrols * 0.1,
          availability: officer.status === 'active' ? 1 : 0.5,
          isAvailable: availableTimeSlots.length > 0
        });
      }

      return workloadData;
    } catch (error) {
      console.error('Error calculating officer workload:', error);
      return officers.map(officer => ({
        officer,
        activePatrols: 0,
        recentPatrols: 0,
        overlappingPatrols: [],
        availableTimeSlots: [{ start: startTime, end: endTime }],
        workloadScore: 0,
        availability: 1,
        isAvailable: true
      }));
    }
  }

  /**
   * Calculate available time slots for an officer
   */
  calculateAvailableTimeSlots(startTime, endTime, overlappingPatrols) {
    if (overlappingPatrols.length === 0) {
      return [{ start: startTime, end: endTime }];
    }

    const timeSlots = [];
    let currentTime = new Date(startTime);

    // Sort patrols by start time
    const sortedPatrols = overlappingPatrols.sort((a, b) => a.startTime - b.startTime);

    for (const patrol of sortedPatrols) {
      // If there's a gap before this patrol, add it as available
      if (currentTime < patrol.startTime) {
        timeSlots.push({
          start: new Date(currentTime),
          end: new Date(patrol.startTime)
        });
      }
      // Move current time to the end of this patrol
      currentTime = new Date(Math.max(currentTime.getTime(), patrol.endTime.getTime()));
    }

    // If there's time remaining after the last patrol, add it
    if (currentTime < endTime) {
      timeSlots.push({
        start: new Date(currentTime),
        end: new Date(endTime)
      });
    }

    // Filter out slots that are too short (less than 30 minutes)
    return timeSlots.filter(slot => {
      const duration = slot.end.getTime() - slot.start.getTime();
      return duration >= 30 * 60 * 1000; // 30 minutes in milliseconds
    });
  }

  /**
   * Generate optimized patrol assignments
   */
  async generatePatrolAssignments(options = {}) {
    const {
      startTime = new Date(),
      endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000), // 8 hours
      availableOfficers: providedOfficers = [],
      maxRoutes = 5,
      includeIncidentAreas = true,
      createMissingRoutes = false
    } = options;

    try {
      // Get all active patrol routes
      let patrolRoutes = await PatrolRoute.find({
        isActive: true
      }).populate('createdBy', 'name');

      // Get all open/in-progress incidents
      const openIncidents = await Incident.find({
        status: { $in: ['reported', 'investigating'] }
      });

      // Get available officers if not provided
      let officers = providedOfficers;
      if (officers.length === 0) {
        officers = await User.find({
          role: 'officer',
          status: { $in: ['active', 'on-duty'] }
        }).select('name email status');
      }

      if (officers.length === 0) {
        throw new Error('No available officers found');
      }

      // Track newly created routes for reporting
      const newlyCreatedRoutes = [];

      // For each incident, check if any route covers the area; if not, create a new route
      if (includeIncidentAreas && createMissingRoutes) {
        for (const incident of openIncidents) {
          // Check if incident has coordinates
          if (incident.coordinates?.latitude && incident.coordinates?.longitude) {
            // Check if any existing route already covers this incident location
            const existingRouteCoversIncident = patrolRoutes.some(route => {
              // Check if any checkpoint in the route is close to the incident
              return route.checkpoints.some(checkpoint => {
                if (checkpoint.coordinates?.latitude && checkpoint.coordinates?.longitude) {
                  const distance = this.calculateDistance(
                    incident.coordinates.latitude,
                    incident.coordinates.longitude,
                    checkpoint.coordinates.latitude,
                    checkpoint.coordinates.longitude
                  );
                  // Consider covered if within 1km of any checkpoint
                  return distance <= 1;
                }
                return false;
              });
            });

            // Only create new route if no existing route covers this incident
            if (!existingRouteCoversIncident) {
              const newRoute = await PatrolRoute.create({
                name: `Incident Response: ${incident.area || 'Unknown Area'}`,
                description: `Auto-generated route for incident at ${incident.area || 'Unknown Area'}`,
                checkpoints: [
                  {
                    name: incident.area || 'Incident Location',
                    description: `Incident location: ${incident.title}`,
                    coordinates: {
                      latitude: incident.coordinates.latitude,
                      longitude: incident.coordinates.longitude
                    },
                    geofenceRadius: 100, // Larger radius for incident areas
                    estimatedTime: 15,
                    order: 1,
                    requirements: {
                      scanQrCode: false,
                      takePhoto: true,
                      writeReport: true,
                      signature: false
                    },
                    isActive: true
                  }
                ],
                totalDistance: 0,
                estimatedDuration: 15,
                difficulty: 'medium',
                securityLevel: 'high',
                isActive: true,
                createdBy: officers[0]._id,
                notes: `Auto-created for incident: ${incident.title} (${incident.severity} severity)`,
                // Store incident information for priority sorting
                incidentSeverity: incident.severity,
                incidentTitle: incident.title,
                incidentId: incident._id
              });
              patrolRoutes.push(newRoute);
              newlyCreatedRoutes.push({
                route: newRoute,
                incident: incident,
                reason: 'Created new route for incident area - no existing route coverage'
              });
            } else {
              // Log that incident is already covered
              console.log(`Incident "${incident.title}" at ${incident.area} is already covered by existing routes`);
            }
          } else {
            // Fallback to area-based matching for incidents without coordinates
            const area = incident.area?.trim().toLowerCase();
            if (!area) continue;
            
            // Check if any existing route covers this area by name
            const existingRouteCoversArea = patrolRoutes.some(route =>
              route.checkpoints.some(cp => cp.name.trim().toLowerCase() === area)
            );
            
            // Only create new route if no existing route covers this area
            if (!existingRouteCoversArea) {
              const newRoute = await PatrolRoute.create({
                name: `Incident Response: ${incident.area}`,
                description: `Auto-generated route for incident at ${incident.area}`,
                checkpoints: [
                  {
                    name: incident.area,
                    description: `Incident location: ${incident.area}`,
                    coordinates: { latitude: 23.03, longitude: 72.58 }, // Default Ahmedabad coordinates
                    geofenceRadius: 50,
                    estimatedTime: 10,
                    order: 1,
                    requirements: {},
                    isActive: true
                  }
                ],
                isActive: true,
                createdBy: officers[0]._id,
                notes: `Auto-created for incident: ${incident.title}`,
                // Store incident information for priority sorting
                incidentSeverity: incident.severity,
                incidentTitle: incident.title,
                incidentId: incident._id
              });
              patrolRoutes.push(newRoute);
              newlyCreatedRoutes.push({
                route: newRoute,
                incident: incident,
                reason: 'Created new route for incident area - no existing route coverage'
              });
            } else {
              // Log that incident area is already covered
              console.log(`Incident area "${incident.area}" is already covered by existing routes`);
            }
          }
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

        // Ensure all values are numbers and provide fallbacks
        const incidentScore = (incidentPriority.priority || 0) * this.factors.incidentPriority;
        const efficiencyScore = (efficiency.efficiency || 0) * this.factors.routeEfficiency;
        const timeScore = (timeMultiplier || 1) * this.factors.timeOfDay;

        const totalScore = incidentScore + efficiencyScore + timeScore;

        routeScores.push({
          route,
          score: totalScore || 0, // Ensure score is never NaN
          incidentPriority: {
            priority: incidentPriority.priority || 0,
            incidentCount: incidentPriority.incidentCount || 0,
            averagePriority: incidentPriority.averagePriority || 0
          },
          efficiency: {
            distance: efficiency.distance || 0,
            checkpointDensity: efficiency.checkpointDensity || 0,
            estimatedDuration: efficiency.estimatedDuration || 0,
            efficiency: efficiency.efficiency || 0
          },
          timeMultiplier: timeMultiplier || 1
        });
      }

      // Sort routes by incident severity (critical > high > medium > low) before assignment
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      routeScores.sort((a, b) => {
        // Use stored incident severity for AI-created routes, fallback to medium for manual routes
        const aSeverity = a.route.incidentSeverity || 'medium';
        const bSeverity = b.route.incidentSeverity || 'medium';
        return (severityOrder[bSeverity] || 0) - (severityOrder[aSeverity] || 0);
      });

      // Get officer workload data
      const officerWorkload = await this.getOfficerWorkload(officers, startTime, endTime);

      // Filter officers who have available time slots
      const availableOfficersData = officerWorkload.filter(officer => officer.isAvailable);

      if (availableOfficersData.length === 0) {
        throw new Error('No officers available for the requested time period. All officers have conflicting patrols.');
      }

      // Assign routes to officers using available time slots
      const assignments = [];
      const totalRoutesToAssign = Math.min(routeScores.length, maxRoutes);
      
      for (let i = 0; i < totalRoutesToAssign; i++) {
        const routeScore = routeScores[i];
        
        // Find the best available officer for this route
        let bestOfficer = null;
        let bestTimeSlot = null;
        let bestScore = -1;

        for (const officerData of availableOfficersData) {
          // Check if this officer has any available time slots
          for (const timeSlot of officerData.availableTimeSlots) {
            // Calculate if this route can fit in the time slot
            const routeDuration = routeScore.efficiency.estimatedDuration || 60;
            const slotDuration = timeSlot.end.getTime() - timeSlot.start.getTime();
            
            if (slotDuration >= routeDuration * 60 * 1000) { // Convert minutes to milliseconds
              // Calculate assignment score based on officer workload and route priority
              const assignmentScore = routeScore.score * (1 - officerData.workloadScore * 0.1);
              
              if (assignmentScore > bestScore) {
                bestScore = assignmentScore;
                bestOfficer = officerData.officer;
                bestTimeSlot = timeSlot;
              }
            }
          }
        }

        if (bestOfficer && bestTimeSlot) {
          // Calculate actual start and end times for this assignment
          const routeDuration = routeScore.efficiency.estimatedDuration || 60;
          const assignmentStartTime = new Date(bestTimeSlot.start);
          const assignmentEndTime = new Date(bestTimeSlot.start.getTime() + routeDuration * 60 * 1000);

          assignments.push({
            route: routeScore.route,
            officer: bestOfficer,
            score: bestScore,
            incidentPriority: routeScore.incidentPriority,
            efficiency: routeScore.efficiency,
            startTime: assignmentStartTime,
            endTime: assignmentEndTime,
            timeSlot: bestTimeSlot
          });

          // Update the officer's available time slots by removing the used time
          const officerData = availableOfficersData.find(o => o.officer._id.toString() === bestOfficer._id.toString());
          if (officerData) {
            // Remove the used time slot and add remaining time if any
            const remainingTime = bestTimeSlot.end.getTime() - assignmentEndTime.getTime();
            if (remainingTime >= 30 * 60 * 1000) { // At least 30 minutes remaining
              officerData.availableTimeSlots = officerData.availableTimeSlots.filter(slot => slot !== bestTimeSlot);
              officerData.availableTimeSlots.push({
                start: assignmentEndTime,
                end: bestTimeSlot.end
              });
            } else {
              // Remove the entire time slot if not enough time remaining
              officerData.availableTimeSlots = officerData.availableTimeSlots.filter(slot => slot !== bestTimeSlot);
            }
            
            // Check if officer still has available time
            officerData.isAvailable = officerData.availableTimeSlots.length > 0;
          }
        }
      }

      return {
        success: true,
        data: {
          assignments,
          newlyCreatedRoutes,
          summary: {
            totalAssignments: assignments.length,
            totalRoutes: patrolRoutes.length,
            totalOfficers: officers.length,
            coverage: assignments.length / Math.min(patrolRoutes.length, maxRoutes) * 100,
            averageScore: assignments.length > 0 ? 
              assignments.reduce((sum, a) => sum + (a.score || 0), 0) / assignments.length : 0,
            routesCreated: newlyCreatedRoutes.length
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