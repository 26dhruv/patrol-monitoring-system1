const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PatrolRouteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide route name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    checkpoints: [
      {
        name: {
          type: String,
          required: [true, 'Please provide checkpoint name'],
          trim: true,
        },
        description: {
          type: String,
          trim: true,
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
        geofenceRadius: {
          type: Number,
          default: 50, // in meters
        },
        estimatedTime: {
          type: Number, // in minutes
          default: 5,
        },
        order: {
          type: Number,
          required: true,
        },
        requirements: {
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
          signature: {
            type: Boolean,
            default: false,
          },
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    totalDistance: {
      type: Number, // in meters
      default: 0,
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 0,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    securityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'restricted'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    notes: {
      type: String,
    },
    // Incident information for AI-created routes
    incidentSeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    incidentTitle: {
      type: String,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
    },
  },
  { timestamps: true }
);

// Create compound index for unique routes (from location to to location)
// PatrolRouteSchema.index(
//   { 
//     'checkpoints.0.name': 1, 
//     [`checkpoints.${PatrolRouteSchema.path('checkpoints').schema.paths.length - 1}.name`]: 1 
//   }, 
//   { 
//     unique: true,
//     partialFilterExpression: { isActive: true }
//   }
// );

// Calculate total distance and duration when checkpoints are updated
PatrolRouteSchema.pre('save', function(next) {
  if (this.checkpoints && this.checkpoints.length > 0) {
    // Calculate total estimated duration
    this.estimatedDuration = this.checkpoints.reduce((total, checkpoint) => {
      return total + (checkpoint.estimatedTime || 0);
    }, 0);
    
    // Calculate total distance (simplified - you might want to use a distance calculation library)
    this.totalDistance = this.checkpoints.length * 100; // Placeholder calculation
  }
  next();
});

// Static method to check if a route already exists
PatrolRouteSchema.statics.checkRouteExists = async function(fromLocation, toLocation) {
  const route = await this.findOne({
    name: `${fromLocation} to ${toLocation}`,
    isActive: true
  });
  return route;
};

// Static method to create a route with automatic checkpoint creation
PatrolRouteSchema.statics.createRoute = async function(routeData, fromLocation, toLocation) {
  // Check if route already exists
  const existingRoute = await this.checkRouteExists(fromLocation, toLocation);
  if (existingRoute) {
    throw new Error(`Route from "${fromLocation}" to "${toLocation}" already exists`);
  }

  // Create checkpoints array
  const checkpoints = [
    {
      name: fromLocation,
      description: `Starting point: ${fromLocation}`,
      coordinates: routeData.fromCoordinates,
      geofenceRadius: 50,
      estimatedTime: 5,
      order: 1,
      requirements: {
        scanQrCode: false,
        takePhoto: true,
        writeReport: false,
        signature: false
      }
    },
    {
      name: toLocation,
      description: `Destination: ${toLocation}`,
      coordinates: routeData.toCoordinates,
      geofenceRadius: 50,
      estimatedTime: 5,
      order: 2,
      requirements: {
        scanQrCode: false,
        takePhoto: true,
        writeReport: false,
        signature: false
      }
    }
  ];

  return this.create({
    ...routeData,
    checkpoints
  });
};

module.exports = mongoose.model('PatrolRoute', PatrolRouteSchema); 