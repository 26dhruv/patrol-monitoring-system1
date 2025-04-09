const mongoose = require('mongoose');

const PatrolLogSchema = new mongoose.Schema(
  {
    patrol: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patrol',
      required: true,
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    action: {
      type: String,
      enum: ['check-in', 'check-out', 'incident-report', 'note', 'issue', 'break'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    photos: [
      {
        url: String,
        caption: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    incidentDetails: {
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      type: {
        type: String,
        enum: ['security', 'safety', 'maintenance', 'other'],
      },
      resolved: {
        type: Boolean,
        default: false,
      },
      reportedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    deviceInfo: {
      deviceId: String,
      batteryLevel: Number,
      networkStatus: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatrolLog', PatrolLogSchema); 