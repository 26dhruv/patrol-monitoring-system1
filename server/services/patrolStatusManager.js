const Patrol = require('../models/Patrol');
const User = require('../models/User');

/**
 * Patrol Status Manager Service
 * Handles automatic patrol status updates and time conflict management
 */
class PatrolStatusManager {
  constructor() {
    // IST timezone offset (UTC+5:30)
    this.istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  }

  /**
   * Get current IST time
   */
  getCurrentISTTime() {
    const utcTime = new Date();
    return new Date(utcTime.getTime() + this.istOffset);
  }

  /**
   * Convert UTC time to IST
   */
  convertToIST(utcTime) {
    return new Date(utcTime.getTime() + this.istOffset);
  }

  /**
   * Convert IST time to UTC
   */
  convertToUTC(istTime) {
    return new Date(istTime.getTime() - this.istOffset);
  }

  /**
   * Check if a patrol should be automatically started
   */
  shouldStartPatrol(patrol) {
    const currentIST = this.getCurrentISTTime();
    const patrolStartIST = this.convertToIST(patrol.startTime);
    
    // Start patrol if current time is within 5 minutes of start time
    const timeDiff = Math.abs(currentIST.getTime() - patrolStartIST.getTime());
    return timeDiff <= 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Check if a patrol should be automatically completed
   */
  shouldCompletePatrol(patrol) {
    const currentIST = this.getCurrentISTTime();
    const patrolEndIST = this.convertToIST(patrol.endTime);
    
    // Complete patrol if current time is past end time
    return currentIST >= patrolEndIST;
  }

  /**
   * Check if a patrol should be automatically marked as overdue
   */
  shouldMarkOverdue(patrol) {
    const currentIST = this.getCurrentISTTime();
    const patrolEndIST = this.convertToIST(patrol.endTime);
    
    // Mark as overdue if more than 30 minutes past end time
    const overdueThreshold = new Date(patrolEndIST.getTime() + 30 * 60 * 1000);
    return currentIST >= overdueThreshold;
  }

  /**
   * Update patrol statuses automatically
   */
  async updatePatrolStatuses() {
    try {
      const currentIST = this.getCurrentISTTime();
      console.log(`🕐 Updating patrol statuses at IST: ${currentIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

      // Get all scheduled patrols
      const scheduledPatrols = await Patrol.find({
        status: 'scheduled'
      }).populate('assignedOfficers', 'name email status');

      // Get all in-progress patrols
      const inProgressPatrols = await Patrol.find({
        status: 'in-progress'
      }).populate('assignedOfficers', 'name email status');

      let startedCount = 0;
      let completedCount = 0;
      let overdueCount = 0;

      // Check scheduled patrols that should start
      for (const patrol of scheduledPatrols) {
        if (this.shouldStartPatrol(patrol)) {
          await Patrol.findByIdAndUpdate(patrol._id, {
            status: 'in-progress',
            actualStartTime: new Date(),
            updatedAt: new Date()
          });
          startedCount++;
          console.log(`🚀 Auto-started patrol: ${patrol.title} (ID: ${patrol._id})`);
        }
      }

      // Check in-progress patrols that should complete or be marked overdue
      for (const patrol of inProgressPatrols) {
        if (this.shouldCompletePatrol(patrol)) {
          await Patrol.findByIdAndUpdate(patrol._id, {
            status: 'completed',
            actualEndTime: new Date(),
            updatedAt: new Date()
          });
          completedCount++;
          console.log(`✅ Auto-completed patrol: ${patrol.title} (ID: ${patrol._id})`);
        } else if (this.shouldMarkOverdue(patrol)) {
          await Patrol.findByIdAndUpdate(patrol._id, {
            status: 'overdue',
            updatedAt: new Date()
          });
          overdueCount++;
          console.log(`⚠️ Auto-marked overdue patrol: ${patrol.title} (ID: ${patrol._id})`);
        }
      }

      console.log(`📊 Status update summary: ${startedCount} started, ${completedCount} completed, ${overdueCount} overdue`);
      return { startedCount, completedCount, overdueCount };
    } catch (error) {
      console.error('Error updating patrol statuses:', error);
      throw error;
    }
  }

  /**
   * Check for time conflicts when creating a new patrol
   */
  async checkTimeConflicts(officerIds, startTime, endTime, excludePatrolId = null) {
    try {
      const conflicts = [];

      for (const officerId of officerIds) {
        // Find overlapping patrols for this officer
        const overlappingPatrols = await Patrol.find({
          assignedOfficers: officerId,
          status: { $in: ['scheduled', 'in-progress'] },
          _id: { $ne: excludePatrolId }, // Exclude current patrol if updating
          $or: [
            // New patrol starts during existing patrol
            { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
            // New patrol ends during existing patrol
            { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
            // New patrol completely encompasses existing patrol
            { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
          ]
        }).populate('patrolRoute', 'name');

        if (overlappingPatrols.length > 0) {
          const officer = await User.findById(officerId).select('name email');
          conflicts.push({
            officerId,
            officerName: officer?.name || 'Unknown Officer',
            overlappingPatrols: overlappingPatrols.map(p => ({
              id: p._id,
              title: p.title,
              startTime: p.startTime,
              endTime: p.endTime,
              routeName: p.patrolRoute?.name || 'Unknown Route'
            }))
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking time conflicts:', error);
      throw error;
    }
  }

  /**
   * Get officer availability for a specific time period
   */
  async getOfficerAvailability(officerId, startTime, endTime, excludePatrolId = null) {
    try {
      // Get all patrols for this officer in the time period
      const patrols = await Patrol.find({
        assignedOfficers: officerId,
        status: { $in: ['scheduled', 'in-progress'] },
        _id: { $ne: excludePatrolId },
        $or: [
          { startTime: { $gte: startTime, $lt: endTime } },
          { endTime: { $gt: startTime, $lte: endTime } },
          { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
        ]
      }).sort({ startTime: 1 });

      // Calculate available time slots
      const availableSlots = [];
      let currentTime = new Date(startTime);

      for (const patrol of patrols) {
        if (currentTime < patrol.startTime) {
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(patrol.startTime)
          });
        }
        currentTime = new Date(Math.max(currentTime.getTime(), patrol.endTime.getTime()));
      }

      // Add remaining time if any
      if (currentTime < endTime) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(endTime)
        });
      }

      // Filter out slots that are too short (less than 30 minutes)
      const validSlots = availableSlots.filter(slot => {
        const duration = slot.end.getTime() - slot.start.getTime();
        return duration >= 30 * 60 * 1000; // 30 minutes
      });

      return {
        isAvailable: validSlots.length > 0,
        availableSlots: validSlots,
        conflictingPatrols: patrols
      };
    } catch (error) {
      console.error('Error getting officer availability:', error);
      throw error;
    }
  }

  /**
   * Get all officers' availability for a time period
   */
  async getAllOfficersAvailability(startTime, endTime) {
    try {
      const officers = await User.find({
        role: 'officer',
        status: { $in: ['active', 'on-duty'] }
      }).select('name email status');

      const availabilityData = [];

      for (const officer of officers) {
        const availability = await this.getOfficerAvailability(officer._id, startTime, endTime);
        availabilityData.push({
          officer,
          ...availability
        });
      }

      return availabilityData;
    } catch (error) {
      console.error('Error getting all officers availability:', error);
      throw error;
    }
  }

  /**
   * Start the automatic status update scheduler
   */
  startStatusScheduler() {
    // Update statuses every minute
    setInterval(async () => {
      try {
        await this.updatePatrolStatuses();
      } catch (error) {
        console.error('Error in status scheduler:', error);
      }
    }, 60 * 1000); // Every minute

    console.log('🔄 Patrol status scheduler started');
  }
}

module.exports = PatrolStatusManager; 