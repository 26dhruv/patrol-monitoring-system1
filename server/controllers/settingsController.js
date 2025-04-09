const Setting = require('../models/Setting');
const { ApiError } = require('../errors');

/**
 * Get user settings
 * @route GET /api/settings
 * @access Private
 */
exports.getSettings = async (req, res, next) => {
  try {
    // Get user from request (set by auth middleware)
    const userId = req.user.userId;

    // Find settings for the user or create default settings
    let settings = await Setting.findOne({ userId });

    if (!settings) {
      // Create default settings for the user
      settings = await Setting.create({ userId });
    }

    // Return only the sections the user is allowed to see
    const response = {
      general: settings.general,
    };

    // Admin and manager users can see admin settings
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      response.admin = settings.admin;
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update general settings
 * @route PUT /api/settings/general
 * @access Private
 */
exports.updateGeneralSettings = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { emailNotifications, pushNotifications, darkMode, language } = req.body;

    // Validate language input if provided
    if (language && !['english', 'spanish', 'french', 'german'].includes(language)) {
      throw new ApiError('Invalid language selection', 400);
    }

    // Find settings document or create if not exists
    let settings = await Setting.findOne({ userId });
    if (!settings) {
      settings = await Setting.create({ userId });
    }

    // Update general settings
    settings.general = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : settings.general.emailNotifications,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : settings.general.pushNotifications,
      darkMode: darkMode !== undefined ? darkMode : settings.general.darkMode,
      language: language || settings.general.language,
    };

    await settings.save();

    res.status(200).json({ message: 'General settings updated successfully', general: settings.general });
  } catch (error) {
    next(error);
  }
};

/**
 * Update admin settings
 * @route PUT /api/settings/admin
 * @access Private (Admin/Manager only)
 */
exports.updateAdminSettings = async (req, res, next) => {
  try {
    // Role authorization is now handled by the middleware
    const userId = req.user.userId;
    const { patrolFrequency, reportRetentionDays, officerInactivityThreshold, systemMaintenanceDay } = req.body;

    // Validate patrolFrequency if provided
    if (patrolFrequency && !['hourly', 'daily', 'weekly', 'monthly'].includes(patrolFrequency)) {
      throw new ApiError('Invalid patrol frequency', 400);
    }

    // Validate systemMaintenanceDay if provided
    if (systemMaintenanceDay && !['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(systemMaintenanceDay)) {
      throw new ApiError('Invalid system maintenance day', 400);
    }

    // Validate numeric inputs
    if (reportRetentionDays && (reportRetentionDays < 1 || reportRetentionDays > 365)) {
      throw new ApiError('Report retention period must be between 1 and 365 days', 400);
    }

    if (officerInactivityThreshold && (officerInactivityThreshold < 1 || officerInactivityThreshold > 90)) {
      throw new ApiError('Officer inactivity threshold must be between 1 and 90 days', 400);
    }

    // Find settings document or create if not exists
    let settings = await Setting.findOne({ userId });
    if (!settings) {
      settings = await Setting.create({ userId });
    }

    // Update admin settings
    settings.admin = {
      patrolFrequency: patrolFrequency || settings.admin.patrolFrequency,
      reportRetentionDays: reportRetentionDays || settings.admin.reportRetentionDays,
      officerInactivityThreshold: officerInactivityThreshold || settings.admin.officerInactivityThreshold,
      systemMaintenanceDay: systemMaintenanceDay || settings.admin.systemMaintenanceDay,
    };

    await settings.save();

    res.status(200).json({ message: 'System settings updated successfully', admin: settings.admin });
  } catch (error) {
    next(error);
  }
}; 