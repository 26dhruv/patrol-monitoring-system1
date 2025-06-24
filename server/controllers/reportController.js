const Patrol = require('../models/Patrol');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Location = require('../models/Location');
const { ApiError } = require('../errors');
const json2csv = require('json2csv').Parser;

/**
 * Get reports data based on type and date range
 * @route GET /api/reports
 * @access Private
 */
exports.getReports = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    if (!type || !startDate || !endDate) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      throw new ApiError('Invalid date format', 400);
    }
    
    let reportData = [];
    
    switch (type) {
      case 'patrol':
        reportData = await getPatrolReports(startDateTime, endDateTime, req.user);
        break;
      case 'incident':
        reportData = await getIncidentReports(startDateTime, endDateTime, req.user);
        break;
      case 'officer':
        reportData = await getOfficerReports(startDateTime, endDateTime, req.user);
        break;
      default:
        throw new ApiError('Invalid report type', 400);
    }
    
    res.status(200).json(reportData);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reports statistics
 * @route GET /api/reports/stats
 * @access Private
 */
exports.getReportStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ApiError('Missing required parameters', 400);
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      throw new ApiError('Invalid date format', 400);
    }

    const dateFilter = {
      startTime: { $gte: startDateTime, $lte: endDateTime },
    };

    // Calculate stats
    const totalPatrols = await Patrol.countDocuments(dateFilter);
    const totalIncidents = await Incident.countDocuments({
      date: { $gte: startDateTime, $lte: endDateTime },
    });
    const patrolsCompleted = await Patrol.countDocuments({
      ...dateFilter,
      status: 'completed',
    });
    
    // Calculate patrol coverage
    const totalLocations = await Location.countDocuments();
    const patrolledLocations = await Patrol.distinct('locations', dateFilter);
    const coveragePercentage = totalLocations > 0 ? (patrolledLocations.length / totalLocations) * 100 : 0;


    res.status(200).json({
      totalPatrols,
      totalIncidents,
      patrolsCompleted,
      coveragePercentage: Math.round(coveragePercentage),
      // Average response time is complex and needs more data points
      // We will return a static value for now
      averageResponseTime: 4.2, 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download reports as CSV
 * @route GET /api/reports/download
 * @access Private
 */
exports.downloadReport = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    if (!type || !startDate || !endDate) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      throw new ApiError('Invalid date format', 400);
    }
    
    let reportData = [];
    let fields = [];
    let filename = '';
    
    switch (type) {
      case 'patrol':
        reportData = await getPatrolReports(startDateTime, endDateTime, req.user);
        fields = ['_id', 'location.name', 'startTime', 'endTime', 'status', 'assignedOfficers'];
        filename = 'patrol-report.csv';
        // Transform assignedOfficers from array to string for CSV
        reportData = reportData.map(patrol => ({
          ...patrol,
          assignedOfficers: patrol.assignedOfficers?.map(officer => officer.name).join(', ') || 'Unassigned',
          'location.name': patrol.location?.name || 'N/A'
        }));
        break;
      case 'incident':
        reportData = await getIncidentReports(startDateTime, endDateTime, req.user);
        fields = ['_id', 'title', 'location.name', 'reportedBy.name', 'date', 'severity', 'status'];
        filename = 'incident-report.csv';
        // Transform for CSV
        reportData = reportData.map(incident => ({
          ...incident,
          'location.name': incident.location?.name || 'N/A',
          'reportedBy.name': incident.reportedBy?.name || 'Unknown'
        }));
        break;
      case 'officer':
        reportData = await getOfficerReports(startDateTime, endDateTime, req.user);
        fields = ['_id', 'name', 'email', 'role', 'patrolsCompleted', 'incidentsReported', 'active'];
        filename = 'officer-report.csv';
        break;
      default:
        throw new ApiError('Invalid report type', 400);
    }
    
    // Convert to CSV
    const json2csvParser = new json2csv({ fields });
    const csv = json2csvParser.parse(reportData);
    
    // Set headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Send CSV
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get patrol reports
 */
async function getPatrolReports(startDate, endDate, user) {
  let query = {
    startTime: { $gte: startDate, $lte: endDate }
  };
  
  // If user is an officer, only show their patrols
  if (user.role === 'officer') {
    query.assignedOfficers = user.userId;
  }
  
  const patrols = await Patrol.find(query)
    .populate('location', 'name')
    .populate('assignedOfficers', 'name')
    .sort({ startTime: -1 });
  
  return patrols;
}

/**
 * Helper function to get incident reports
 */
async function getIncidentReports(startDate, endDate, user) {
  let query = {
    date: { $gte: startDate, $lte: endDate }
  };
  
  // If user is an officer, only show incidents they reported
  if (user.role === 'officer') {
    query.reportedBy = user.userId;
  }
  
  const incidents = await Incident.find(query)
    .populate('location', 'name')
    .populate('reportedBy', 'name')
    .sort({ date: -1 });
  
  return incidents;
}

/**
 * Helper function to get officer reports
 */
async function getOfficerReports(startDate, endDate, user) {
  // Role checking moved to route middleware
  
  // Get all officers
  const officers = await User.find({ role: 'officer' });
  
  // For each officer, calculate patrols and incidents
  const officerReports = await Promise.all(officers.map(async (officer) => {
    // Count completed patrols in date range
    const patrolsCompleted = await Patrol.countDocuments({
      assignedOfficers: officer._id,
      status: 'completed',
      startTime: { $gte: startDate, $lte: endDate }
    });
    
    // Count incidents reported in date range
    const incidentsReported = await Incident.countDocuments({
      reportedBy: officer._id,
      date: { $gte: startDate, $lte: endDate }
    });
    
    return {
      _id: officer._id,
      name: officer.name,
      email: officer.email,
      role: officer.role,
      patrolsCompleted,
      incidentsReported,
      active: officer.active
    };
  }));
  
  return officerReports;
} 