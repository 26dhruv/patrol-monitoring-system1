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
    locations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true,
      },
    ],
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
    checkpoints: [
      {
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Location',
        },
        requiredTime: {
          type: Date,
        },
        actualTime: {
          type: Date,
        },
        status: {
          type: String,
          enum: ['pending', 'completed', 'missed'],
          default: 'pending',
        },
        notes: {
          type: String,
        },
      },
    ],
    recurrence: {
      type: String,
      enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'none'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patrol', PatrolSchema); 