const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide location name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    locationType: {
      type: String,
      enum: ['building', 'area', 'checkpoint', 'entrance', 'perimeter', 'other'],
      default: 'checkpoint',
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Please provide latitude'],
      },
      longitude: {
        type: Number,
        required: [true, 'Please provide longitude'],
      },
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    geofenceRadius: {
      type: Number,
      default: 50, // in meters
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    securityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'restricted'],
      default: 'medium',
    },
    checkInRequirements: {
      scanQrCode: {
        type: Boolean,
        default: false,
      },
      takePhoto: {
        type: Boolean,
        default: false,
      },
      writeReport: {
        type: Boolean,
        default: false,
      },
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Location', LocationSchema); 