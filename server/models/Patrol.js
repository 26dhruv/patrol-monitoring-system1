const mongoose = require('mongoose');

const PatrolSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide patrol title'],
      trim: true,
    },
    assignedOfficers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patrolRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatrolRoute',
      required: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Please provide patrol start time'],
    },
    endTime: {
      type: Date,
      required: [true, 'Please provide patrol end time'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    checkpointProgress: [
      {
        checkpointId: {
          type: String, // Reference to checkpoint within the route
          required: true,
        },
        checkpointName: {
          type: String,
          required: true,
        },
        requiredTime: {
          type: Date,
        },
        actualTime: {
          type: Date,
        },
        status: {
          type: String,
          enum: ['pending', 'completed', 'missed', 'skipped'],
          default: 'pending',
        },
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        notes: {
          type: String,
        },
        photos: [String], // Array of photo URLs
        signature: String, // Signature data if required
        qrCodeScanned: {
          type: Boolean,
          default: false,
        },
        location: {
          latitude: Number,
          longitude: Number,
          accuracy: Number,
        },
      },
    ],
    recurrence: {
      type: String,
      enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'none'],
      default: 'none',
    },
    actualStartTime: {
      type: Date,
    },
    actualEndTime: {
      type: Date,
    },
    totalDistance: {
      type: Number, // in meters
      default: 0,
    },
    actualDuration: {
      type: Number, // in minutes
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patrol', PatrolSchema); 