const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    general: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: false,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
      language: {
        type: String,
        enum: ['english', 'spanish', 'french', 'german'],
        default: 'english',
      },
    },
    admin: {
      patrolFrequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        default: 'daily',
      },
      reportRetentionDays: {
        type: Number,
        default: 90,
        min: 1,
        max: 365,
      },
      officerInactivityThreshold: {
        type: Number,
        default: 30,
        min: 1,
        max: 90,
      },
      systemMaintenanceDay: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        default: 'sunday',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index to ensure each user has only one settings document
SettingSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Setting', SettingSchema); 