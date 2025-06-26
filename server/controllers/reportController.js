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
    console.log('🔍 Reports API called with query:', req.query);
    const { type, startDate, endDate } = req.query;
    
    if (!type || !startDate || !endDate) {
      throw new ApiError('Missing required parameters', 400);
    }
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      throw new ApiError('Invalid date format', 400);
    }
    
    console.log('📅 Date range:', { startDateTime, endDateTime });
    console.log('📊 Report type:', type);
    
    let reportData = [];
    
    switch (type) {
      case 'patrol':
        console.log('🚔 Fetching patrol reports...');
        reportData = await getPatrolReports(startDateTime, endDateTime, req.user);
        console.log('✅ Patrol reports fetched:', reportData.length);
        break;
      case 'incident':
        console.log('🚨 Fetching incident reports...');
        reportData = await getIncidentReports(startDateTime, endDateTime, req.user);
        console.log('✅ Incident reports fetched:', reportData.length);
        break;
      case 'officer':
        console.log('👮 Fetching officer reports...');
        reportData = await getOfficerReports(startDateTime, endDateTime, req.user);
        console.log('✅ Officer reports fetched:', reportData.length);
        break;
      default:
        throw new ApiError('Invalid report type', 400);
    }
    
    console.log('📤 Sending response with', reportData.length, 'records');
    res.status(200).json(reportData);
  } catch (error) {
    console.error('❌ Error in getReports:', error);
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
    
    // Calculate patrol coverage - simplified approach
    const totalLocations = await Location.countDocuments();
    // Get unique patrol routes that were used in the date range
    const usedPatrolRoutes = await Patrol.distinct('patrolRoute', dateFilter);
    const coveragePercentage = totalLocations > 0 ? (usedPatrolRoutes.length / totalLocations) * 100 : 0;

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
        fields = [
          'Patrol ID', 
          'Patrol Route', 
          'Title', 
          'Start Time', 
          'End Time', 
          'Status', 
          'Priority', 
          'Assigned Officers',
          'Notes'
        ];
        filename = 'patrol-report.csv';
        // Transform patrol data for CSV
        reportData = reportData.map(patrol => ({
          'Patrol ID': patrol._id || 'N/A',
          'Patrol Route': patrol.patrolRoute?.name || patrol.title || 'N/A',
          'Title': patrol.title || 'N/A',
          'Start Time': patrol.startTime ? new Date(patrol.startTime).toLocaleString() : 'N/A',
          'End Time': patrol.endTime ? new Date(patrol.endTime).toLocaleString() : 'Ongoing',
          'Status': patrol.status || 'scheduled',
          'Priority': patrol.priority || 'medium',
          'Assigned Officers': patrol.assignedOfficers?.length > 0 
            ? patrol.assignedOfficers.map(officer => officer.name || officer).join(', ')
            : 'Unassigned',
          'Notes': patrol.notes || 'N/A'
        }));
        break;
      case 'incident':
        reportData = await getIncidentReports(startDateTime, endDateTime, req.user);
        fields = [
          'Incident ID', 
          'Title', 
          'Location', 
          'Reported By', 
          'Date', 
          'Severity', 
          'Status',
          'Description'
        ];
        filename = 'incident-report.csv';
        // Transform incident data for CSV
        reportData = reportData.map(incident => ({
          'Incident ID': incident._id || 'N/A',
          'Title': incident.title || 'N/A',
          'Location': incident.location?.name || 'N/A',
          'Reported By': incident.reportedBy?.name || 'Unknown',
          'Date': incident.date ? new Date(incident.date).toLocaleString() : 'N/A',
          'Severity': incident.severity || 'low',
          'Status': incident.status || 'pending',
          'Description': incident.description || 'N/A'
        }));
        break;
      case 'officer':
        reportData = await getOfficerReports(startDateTime, endDateTime, req.user);
        fields = [
          'Officer ID', 
          'Name', 
          'Email', 
          'Role', 
          'Patrols Completed', 
          'Incidents Reported', 
          'Status'
        ];
        filename = 'officer-report.csv';
        // Transform officer data for CSV
        reportData = reportData.map(officer => ({
          'Officer ID': officer._id || 'N/A',
          'Name': officer.name || 'N/A',
          'Email': officer.email || 'N/A',
          'Role': officer.role || 'N/A',
          'Patrols Completed': officer.patrolsCompleted || 0,
          'Incidents Reported': officer.incidentsReported || 0,
          'Status': officer.active ? 'Active' : 'Inactive'
        }));
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
  console.log('🔍 getPatrolReports called with:', { startDate, endDate, userRole: user.role });
  
  let query = {
    startTime: { $gte: startDate, $lte: endDate }
  };
  
  // If user is an officer, only show their patrols
  if (user.role === 'officer') {
    query.assignedOfficers = user.userId;
  }
  
  console.log('🔍 Patrol query:', JSON.stringify(query, null, 2));
  
  try {
    // Get patrols with full population
    console.log('🔍 Fetching patrols with populate...');
    const patrols = await Patrol.find(query)
      .populate('patrolRoute', 'name checkpoints description')
      .populate('assignedOfficers', 'name email')
      .populate('assignedBy', 'name')
      .sort({ startTime: -1 });
    
    console.log('✅ Patrol query with populate completed, found', patrols.length, 'patrols');
    
    // Transform the data to ensure all fields are properly formatted
    const transformedPatrols = patrols.map(patrol => ({
      _id: patrol._id,
      title: patrol.title,
      patrolRoute: patrol.patrolRoute,
      assignedOfficers: patrol.assignedOfficers || [],
      assignedBy: patrol.assignedBy,
      startTime: patrol.startTime,
      endTime: patrol.endTime,
      status: patrol.status,
      priority: patrol.priority,
      notes: patrol.notes,
      actualStartTime: patrol.actualStartTime,
      actualEndTime: patrol.actualEndTime,
      totalDistance: patrol.totalDistance,
      actualDuration: patrol.actualDuration,
      checkpointProgress: patrol.checkpointProgress || []
    }));
    
    console.log('✅ Patrol data transformed for', transformedPatrols.length, 'patrols');
    return transformedPatrols;
  } catch (error) {
    console.error('❌ Error in getPatrolReports:', error);
    throw error;
  }
}

/**
 * Helper function to get incident reports
 */
async function getIncidentReports(startDate, endDate, user) {
  console.log('🔍 getIncidentReports called with:', { startDate, endDate, userRole: user.role });
  
  let query = {
    date: { $gte: startDate, $lte: endDate }
  };
  
  // If user is an officer, only show incidents they reported
  if (user.role === 'officer') {
    query.reportedBy = user.userId;
  }
  
  console.log('🔍 Incident query:', JSON.stringify(query, null, 2));
  
  try {
    // Get incidents with full population
    console.log('🔍 Fetching incidents with populate...');
    const incidents = await Incident.find(query)
      .populate('location', 'name address coordinates')
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ date: -1 });
    
    console.log('✅ Incident query with populate completed, found', incidents.length, 'incidents');
    
    // Transform the data to ensure all fields are properly formatted
    const transformedIncidents = incidents.map(incident => ({
      _id: incident._id,
      title: incident.title,
      description: incident.description,
      location: incident.location,
      reportedBy: incident.reportedBy,
      assignedOfficers: incident.assignedTo || [],
      date: incident.date,
      severity: incident.severity,
      status: incident.status,
      category: incident.category,
      photos: incident.photos || [],
      notes: incident.notes
    }));
    
    console.log('✅ Incident data transformed for', transformedIncidents.length, 'incidents');
    return transformedIncidents;
  } catch (error) {
    console.error('❌ Error in getIncidentReports:', error);
    throw error;
  }
}

/**
 * Helper function to get officer reports
 */
async function getOfficerReports(startDate, endDate, user) {
  console.log('🔍 getOfficerReports called with:', { startDate, endDate, userRole: user.role });
  
  // Role checking moved to route middleware
  
  try {
    // Get all officers
    console.log('🔍 Fetching all officers...');
    const officers = await User.find({ role: 'officer' });
    console.log('✅ Found', officers.length, 'officers');
    
    // Calculate actual patrol and incident counts for each officer
    const officerReports = await Promise.all(officers.map(async (officer) => {
      // Count patrols completed by this officer in the date range
      const patrolsCompleted = await Patrol.countDocuments({
        assignedOfficers: officer._id,
        startTime: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });
      
      // Count incidents reported by this officer in the date range
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
        active: officer.status === 'active' || officer.status === 'on-duty'
      };
    }));
    
    console.log('✅ Officer reports created for', officerReports.length, 'officers');
    return officerReports;
  } catch (error) {
    console.error('❌ Error in getOfficerReports:', error);
    throw error;
  }
} 