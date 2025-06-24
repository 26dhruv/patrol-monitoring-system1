require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const PatrolRoute = require('../models/PatrolRoute');
const User = require('../models/User');

// MongoDB URI - use environment variable
const MONGO_URI = process.env.MONGO_URI;

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

const seedPatrolRoutes = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get an admin user to use as createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please run seedUsers.js first.');
      process.exit(1);
    }

    // Define sample patrol routes
    const routes = [
      {
        name: 'Main Building Perimeter',
        description: 'Complete perimeter check of the main building including all entrances and exits',
        difficulty: 'medium',
        securityLevel: 'high',
        tags: ['perimeter', 'main-building', 'security'],
        checkpoints: [
          {
            name: 'Main Entrance',
            description: 'Front entrance security check',
            coordinates: { latitude: 40.7128, longitude: -74.0060 },
            geofenceRadius: 30,
            estimatedTime: 5,
            order: 1,
            requirements: {
              scanQrCode: true,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          },
          {
            name: 'East Side Entrance',
            description: 'East entrance and parking lot check',
            coordinates: { latitude: 40.7130, longitude: -74.0055 },
            geofenceRadius: 25,
            estimatedTime: 3,
            order: 2,
            requirements: {
              scanQrCode: false,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          },
          {
            name: 'Back Loading Dock',
            description: 'Loading dock security inspection',
            coordinates: { latitude: 40.7125, longitude: -74.0065 },
            geofenceRadius: 40,
            estimatedTime: 7,
            order: 3,
            requirements: {
              scanQrCode: true,
              takePhoto: true,
              writeReport: true,
              signature: true
            }
          },
          {
            name: 'West Side Exit',
            description: 'West exit and emergency door check',
            coordinates: { latitude: 40.7128, longitude: -74.0068 },
            geofenceRadius: 35,
            estimatedTime: 4,
            order: 4,
            requirements: {
              scanQrCode: false,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          }
        ]
      },
      {
        name: 'Parking Lot Security',
        description: 'Comprehensive parking lot security check including vehicle inspection',
        difficulty: 'easy',
        securityLevel: 'medium',
        tags: ['parking', 'vehicle', 'security'],
        checkpoints: [
          {
            name: 'North Parking Entrance',
            description: 'Main parking entrance security check',
            coordinates: { latitude: 40.7135, longitude: -74.0050 },
            geofenceRadius: 50,
            estimatedTime: 6,
            order: 1,
            requirements: {
              scanQrCode: true,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          },
          {
            name: 'Employee Parking Section',
            description: 'Employee parking area inspection',
            coordinates: { latitude: 40.7132, longitude: -74.0052 },
            geofenceRadius: 60,
            estimatedTime: 8,
            order: 2,
            requirements: {
              scanQrCode: false,
              takePhoto: true,
              writeReport: true,
              signature: false
            }
          },
          {
            name: 'Visitor Parking Area',
            description: 'Visitor parking security check',
            coordinates: { latitude: 40.7138, longitude: -74.0055 },
            geofenceRadius: 45,
            estimatedTime: 5,
            order: 3,
            requirements: {
              scanQrCode: false,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          }
        ]
      },
      {
        name: 'Office Floor Patrol',
        description: 'Internal office floor security check during business hours',
        difficulty: 'medium',
        securityLevel: 'medium',
        tags: ['internal', 'office', 'floor'],
        checkpoints: [
          {
            name: 'Reception Area',
            description: 'Main reception and lobby area check',
            coordinates: { latitude: 40.7126, longitude: -74.0058 },
            geofenceRadius: 20,
            estimatedTime: 3,
            order: 1,
            requirements: {
              scanQrCode: true,
              takePhoto: false,
              writeReport: false,
              signature: false
            }
          },
          {
            name: 'Conference Room Corridor',
            description: 'Conference room area security check',
            coordinates: { latitude: 40.7124, longitude: -74.0062 },
            geofenceRadius: 25,
            estimatedTime: 4,
            order: 2,
            requirements: {
              scanQrCode: false,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          },
          {
            name: 'IT Server Room',
            description: 'IT server room security inspection',
            coordinates: { latitude: 40.7122, longitude: -74.0065 },
            geofenceRadius: 15,
            estimatedTime: 5,
            order: 3,
            requirements: {
              scanQrCode: true,
              takePhoto: true,
              writeReport: true,
              signature: true
            }
          },
          {
            name: 'Executive Office Area',
            description: 'Executive office area security check',
            coordinates: { latitude: 40.7128, longitude: -74.0068 },
            geofenceRadius: 30,
            estimatedTime: 4,
            order: 4,
            requirements: {
              scanQrCode: false,
              takePhoto: true,
              writeReport: false,
              signature: false
            }
          }
        ]
      }
    ];

    // Clear existing patrol routes
    await PatrolRoute.deleteMany({});
    console.log('Existing patrol routes deleted');

    // Create patrol routes
    const createdRoutes = [];
    for (const routeData of routes) {
      const route = await PatrolRoute.create({
        ...routeData,
        createdBy: adminUser._id
      });
      createdRoutes.push(route);
    }

    console.log(`${createdRoutes.length} patrol routes created`);
    
    // Output the route info
    createdRoutes.forEach(route => {
      console.log(`Created route: ${route.name} with ${route.checkpoints.length} checkpoints`);
      console.log(`  - Difficulty: ${route.difficulty}`);
      console.log(`  - Security Level: ${route.securityLevel}`);
      console.log(`  - Estimated Duration: ${route.estimatedDuration} minutes`);
      console.log(`  - Checkpoints:`);
      route.checkpoints.forEach(cp => {
        console.log(`    * ${cp.order}. ${cp.name} (${cp.estimatedTime} min)`);
      });
      console.log('');
    });

    console.log('Patrol routes seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding patrol routes:', error);
    process.exit(1);
  }
};

// Run the seed function
seedPatrolRoutes(); 