const Incident = require('../models/Incident');
const User = require('../models/User');
const Location = require('../models/Location');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, NotFoundError, UnauthenticatedError } = require('../errors');

/**
 * Get all incidents with filtering, sorting, and pagination
 */
const getAllIncidents = async (req, res) => {
  const { 
    status, 
    severity, 
    category, 
    startDate, 
    endDate, 
    search, 
    location, 
    assignedTo 
  } = req.query;
  
  // Build query filters
  const queryObject = {};

  // Filter by status
  if (status) {
    queryObject.status = status;
  }
  
  // Filter by severity
  if (severity) {
    queryObject.severity = severity;
  }
  
  // Filter by category
  if (category) {
    queryObject.category = category;
  }
  
  // Filter by date range
  if (startDate || endDate) {
    queryObject.date = {};
    if (startDate) {
      queryObject.date.$gte = new Date(startDate);
    }
    if (endDate) {
      queryObject.date.$lte = new Date(endDate);
    }
  }
  
  // Filter by location
  if (location) {
    queryObject.location = location;
  }
  
  // Filter by assigned officer
  if (assignedTo) {
    queryObject.assignedTo = assignedTo;
  }
  
  // Search in title or description
  if (search) {
    queryObject.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Sorting
  let sortOptions = {};
  const sortField = req.query.sortField || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  sortOptions[sortField] = sortOrder;
  
  // Execute query with pagination and populate references
  const incidents = await Incident.find(queryObject)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('location', 'name')
    .populate('reportedBy', 'name')
    .populate('assignedTo', 'name badgeNumber');
  
  // Get total count for pagination
  const totalIncidents = await Incident.countDocuments(queryObject);
  
  res.status(StatusCodes.OK).json({
    data: incidents,
    totalIncidents,
    currentPage: page,
    totalPages: Math.ceil(totalIncidents / limit)
  });
};

/**
 * Get a specific incident by ID
 */
const getIncident = async (req, res) => {
  const { id } = req.params;
  
  const incident = await Incident.findById(id)
    .populate('location', 'name coordinates')
    .populate('reportedBy', 'name email badgeNumber')
    .populate('assignedTo', 'name email badgeNumber phone')
    .populate('notes.addedBy', 'name')
    .populate('actions.takenBy', 'name');
  
  if (!incident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  res.status(StatusCodes.OK).json({ data: incident });
};

/**
 * Create a new incident
 */
const createIncident = async (req, res) => {
  try {
    console.log('Creating incident with data:', JSON.stringify(req.body));
    console.log('User info:', req.user);
    
    // Add the current user as the reporter
    req.body.reportedBy = req.user.userId;
    
    const incident = await Incident.create(req.body);
    console.log('Incident created successfully:', incident._id);
    
    res.status(StatusCodes.CREATED).json({
      data: incident,
      message: 'Incident reported successfully'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      console.error('Validation errors:', messages);
      throw new BadRequestError(`Validation Error: ${messages.join(', ')}`);
    }
    throw error;
  }
};

/**
 * Update an existing incident
 */
const updateIncident = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;
  
  // Find existing incident
  const incident = await Incident.findById(id);
  
  if (!incident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  // Only allow the reporter, assigned officers, or admin/managers to update
  const isReporter = incident.reportedBy && incident.reportedBy.toString() === userId;
  const isAssigned = incident.assignedTo && incident.assignedTo.some(officer => officer.toString() === userId);
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
  
  if (!isReporter && !isAssigned && !isAdminOrManager) {
    throw new UnauthenticatedError('Not authorized to update this incident');
  }
  
  // Perform the update
  const updatedIncident = await Incident.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  ).populate('location', 'name')
    .populate('reportedBy', 'name')
    .populate('assignedTo', 'name badgeNumber');
  
  res.status(StatusCodes.OK).json({
    data: updatedIncident,
    message: 'Incident updated successfully'
  });
};

/**
 * Delete an incident
 */
const deleteIncident = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;
  
  // Only allow admin or manager to delete
  if (userRole !== 'admin' && userRole !== 'manager') {
    throw new UnauthenticatedError('Not authorized to delete incidents');
  }
  
  const incident = await Incident.findById(id);
  
  if (!incident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  await Incident.findByIdAndDelete(id);
  
  res.status(StatusCodes.OK).json({
    message: 'Incident deleted successfully'
  });
};

/**
 * Add a note to an incident
 */
const addNote = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.userId;
  
  if (!content) {
    throw new BadRequestError('Note content is required');
  }
  
  // Find existing incident
  const incident = await Incident.findById(id);
  
  if (!incident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  // Add the note with current user as addedBy
  incident.notes.push({
    content,
    addedBy: userId
  });
  
  await incident.save();
  
  // Return updated incident with populated fields
  const updatedIncident = await Incident.findById(id)
    .populate('location', 'name coordinates')
    .populate('reportedBy', 'name email badgeNumber')
    .populate('assignedTo', 'name email badgeNumber phone')
    .populate('notes.addedBy', 'name')
    .populate('actions.takenBy', 'name');
  
  res.status(StatusCodes.OK).json({
    data: updatedIncident,
    message: 'Note added successfully'
  });
};

/**
 * Add an action to an incident
 */
const addAction = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const userId = req.user.userId;
  
  if (!description) {
    throw new BadRequestError('Action description is required');
  }
  
  // Find existing incident
  const incident = await Incident.findById(id);
  
  if (!incident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  // Add the action with current user as takenBy
  incident.actions.push({
    description,
    takenBy: userId
  });
  
  await incident.save();
  
  // Return updated incident with populated fields
  const updatedIncident = await Incident.findById(id)
    .populate('location', 'name coordinates')
    .populate('reportedBy', 'name email badgeNumber')
    .populate('assignedTo', 'name email badgeNumber phone')
    .populate('notes.addedBy', 'name')
    .populate('actions.takenBy', 'name');
  
  res.status(StatusCodes.OK).json({
    data: updatedIncident,
    message: 'Action recorded successfully'
  });
};

/**
 * Assign officers to an incident
 */
const assignIncident = async (req, res) => {
  const { id } = req.params;
  const { officerIds } = req.body;
  const userRole = req.user.role;
  
  // Only allow admin or manager to assign
  if (userRole !== 'admin' && userRole !== 'manager') {
    throw new UnauthenticatedError('Not authorized to assign incidents');
  }
  
  if (!Array.isArray(officerIds)) {
    throw new BadRequestError('Officer IDs must be provided as an array');
  }
  
  // Verify all officers exist
  const officerCount = await User.countDocuments({
    _id: { $in: officerIds },
    role: 'officer'
  });
  
  if (officerCount !== officerIds.length) {
    throw new BadRequestError('One or more officer IDs are invalid');
  }
  
  // Update the incident
  const updatedIncident = await Incident.findByIdAndUpdate(
    id,
    { assignedTo: officerIds },
    { new: true, runValidators: true }
  ).populate('location', 'name')
    .populate('reportedBy', 'name')
    .populate('assignedTo', 'name badgeNumber');
  
  if (!updatedIncident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  res.status(StatusCodes.OK).json({
    data: updatedIncident,
    message: 'Officers assigned successfully'
  });
};

/**
 * Update incident status
 */
const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;
  const userRole = req.user.role;
  
  if (!status) {
    throw new BadRequestError('Status is required');
  }
  
  // Find existing incident
  const incident = await Incident.findById(id);
  
  if (!incident) {
    throw new NotFoundError(`No incident found with id: ${id}`);
  }
  
  // Only allow assigned officers, admin, or manager to update status
  const isAssigned = incident.assignedTo && incident.assignedTo.some(officer => officer.toString() === userId);
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
  
  if (!isAssigned && !isAdminOrManager) {
    throw new UnauthenticatedError('Not authorized to update this incident status');
  }
  
  // Update status and add action recording the status change
  incident.status = status;
  incident.actions.push({
    description: `Status updated to ${status}`,
    takenBy: userId
  });
  
  await incident.save();
  
  // Return updated incident with populated fields
  const updatedIncident = await Incident.findById(id)
    .populate('location', 'name coordinates')
    .populate('reportedBy', 'name email badgeNumber')
    .populate('assignedTo', 'name email badgeNumber phone')
    .populate('notes.addedBy', 'name')
    .populate('actions.takenBy', 'name');
  
  res.status(StatusCodes.OK).json({
    data: updatedIncident,
    message: 'Status updated successfully'
  });
};

/**
 * Get incident statistics
 */
const getIncidentStats = async (req, res) => {
  try {
    // Extract user role and ID from query parameters or request user
    const userRole = req.query.userRole || req.user?.role;
    const userId = req.query.userId || req.user?.userId;
    
    // Build base query based on role
    let baseQuery = {};
    if (userRole === 'officer') {
      // Officer: only incidents assigned to them
      baseQuery.assignedTo = userId;
    }
    // Manager and Admin: show all incidents (no filter)
    
    // Count total incidents
    const total = await Incident.countDocuments(baseQuery);
    
    // Get counts by status
    const statusCounts = await Incident.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get counts by severity
    const severityCounts = await Incident.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    
    // Get counts by category
    const categoryCounts = await Incident.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Get recent incidents
    let recentIncidentsQuery = Incident.find(baseQuery);
    const recentIncidents = await recentIncidentsQuery
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('location', 'name')
      .populate('assignedTo', 'name');
    
    // Format the statistics object
    const stats = {
      total,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      severityCounts: severityCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      categoryCounts: categoryCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentIncidents,
      userRole // Include user role for frontend to use
    };
    
    res.status(StatusCodes.OK).json({ data: stats });
  } catch (error) {
    console.error('Error fetching incident stats:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: 'Failed to fetch incident statistics' 
    });
  }
};

module.exports = {
  getAllIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  addNote,
  addAction,
  assignIncident,
  updateStatus,
  getIncidentStats
}; 