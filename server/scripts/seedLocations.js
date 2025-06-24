require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Location = require('../models/Location');
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

const seedLocations = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get an admin user to use as createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please run seedUsers.js first.');
      process.exit(1);
    }

    // Define sample locations
    const locations = [
      {
        name: 'Main Building',
        description: 'Main office building entrance',
        locationType: 'building',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        address: '123 Main Street, New York, NY 10001',
        geofenceRadius: 50,
        securityLevel: 'high',
        checkInRequirements: {
          scanQrCode: true,
          takePhoto: true,
          writeReport: false
        },
        createdBy: adminUser._id
      },
      {
        name: 'Parking Lot A',
        description: 'Employee parking area',
        locationType: 'area',
        coordinates: {
          latitude: 40.7135,
          longitude: -74.0050
        },
        address: 'Parking Lot A, New York, NY 10001',
        geofenceRadius: 100,
        securityLevel: 'medium',
        checkInRequirements: {
          scanQrCode: false,
          takePhoto: true,
          writeReport: false
        },
        createdBy: adminUser._id
      },
      {
        name: 'Loading Dock',
        description: 'Back loading dock and delivery area',
        locationType: 'checkpoint',
        coordinates: {
          latitude: 40.7125,
          longitude: -74.0065
        },
        address: 'Loading Dock, New York, NY 10001',
        geofenceRadius: 75,
        securityLevel: 'high',
        checkInRequirements: {
          scanQrCode: true,
          takePhoto: true,
          writeReport: true
        },
        createdBy: adminUser._id
      },
      {
        name: 'Security Office',
        description: 'Main security office and control room',
        locationType: 'building',
        coordinates: {
          latitude: 40.7122,
          longitude: -74.0065
        },
        address: 'Security Office, New York, NY 10001',
        geofenceRadius: 30,
        securityLevel: 'restricted',
        checkInRequirements: {
          scanQrCode: true,
          takePhoto: false,
          writeReport: false
        },
        createdBy: adminUser._id
      },
      {
        name: 'Visitor Center',
        description: 'Visitor reception and check-in area',
        locationType: 'entrance',
        coordinates: {
          latitude: 40.7126,
          longitude: -74.0058
        },
        address: 'Visitor Center, New York, NY 10001',
        geofenceRadius: 40,
        securityLevel: 'medium',
        checkInRequirements: {
          scanQrCode: false,
          takePhoto: true,
          writeReport: false
        },
        createdBy: adminUser._id
      },
      {
        name: 'IT Server Room',
        description: 'IT infrastructure and server room',
        locationType: 'other',
        coordinates: {
          latitude: 40.7122,
          longitude: -74.0065
        },
        address: 'IT Server Room, New York, NY 10001',
        geofenceRadius: 20,
        securityLevel: 'restricted',
        checkInRequirements: {
          scanQrCode: true,
          takePhoto: true,
          writeReport: true
        },
        createdBy: adminUser._id
      }
    ];

    // Clear existing locations
    await Location.deleteMany({});
    console.log('Existing locations deleted');

    // Create locations
    const createdLocations = await Location.create(locations);
    console.log(`${createdLocations.length} locations created`);
    
    // Output the location info
    createdLocations.forEach(location => {
      console.log(`Created location: ${location.name}`);
      console.log(`  - Type: ${location.locationType}`);
      console.log(`  - Security Level: ${location.securityLevel}`);
      console.log(`  - Coordinates: ${location.coordinates.latitude}, ${location.coordinates.longitude}`);
      console.log('');
    });

    console.log('Locations seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding locations:', error);
    process.exit(1);
  }
};

// Run the seed function
seedLocations(); 