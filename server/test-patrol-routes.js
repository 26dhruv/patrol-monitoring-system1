require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');
const Location = require('./models/Location');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

const testPatrolRoutes = async () => {
  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found');
      process.exit(1);
    }

    // Get locations
    const locations = await Location.find({});
    console.log(`Found ${locations.length} locations`);

    // Test creating a patrol route
    const routeData = {
      name: 'Test Route',
      description: 'Test route from Main Building to Parking Lot',
      fromLocation: 'Main Building',
      toLocation: 'Parking Lot A',
      fromCoordinates: { latitude: 40.7128, longitude: -74.0060 },
      toCoordinates: { latitude: 40.7135, longitude: -74.0050 },
      difficulty: 'medium',
      securityLevel: 'medium',
      tags: ['test'],
      notes: 'Test route',
      createdBy: adminUser._id
    };

    console.log('Creating test route...');
    const route = await PatrolRoute.createRoute(routeData, 'Main Building', 'Parking Lot A');
    console.log('Route created successfully:', route.name);

    // Test getting all routes
    const allRoutes = await PatrolRoute.find({});
    console.log(`Total routes: ${allRoutes.length}`);

    // Test route uniqueness
    console.log('Testing route uniqueness...');
    try {
      await PatrolRoute.createRoute(routeData, 'Main Building', 'Parking Lot A');
      console.log('ERROR: Duplicate route was created!');
    } catch (error) {
      console.log('SUCCESS: Route uniqueness enforced:', error.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testPatrolRoutes(); 