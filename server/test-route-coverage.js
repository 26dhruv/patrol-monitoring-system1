const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');
const Incident = require('./models/Incident');
const User = require('./models/User');
const aiScheduler = require('./services/aiScheduler');

async function testRouteCoverage() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Get a user for creating routes
    const user = await User.findOne({role: 'officer'});
    if (!user) {
      console.log('❌ No officer found. Creating a test officer...');
      const testOfficer = await User.create({
        name: 'Test Officer',
        email: 'test.officer@patrol.com',
        password: 'password123',
        role: 'officer',
        status: 'active',
        phone: '1234567890'
      });
      console.log('✅ Created test officer:', testOfficer.name);
    }

    const createdByUser = user || await User.findOne({role: 'officer'});

    // Clear existing routes
    await PatrolRoute.deleteMany({});
    console.log('🗑️  Cleared existing routes');

    // Create a test route that covers "Satellite" area (close to incident coordinates)
    const coveringRoute = await PatrolRoute.create({
      name: 'Test Route - Covers Satellite',
      description: 'This route covers the Satellite area',
      checkpoints: [
        {
          name: 'Satellite Checkpoint',
          description: 'Checkpoint near Satellite area',
          coordinates: {
            latitude: 23.0225,  // Same as incident coordinates
            longitude: 72.5714
          },
          geofenceRadius: 50,
          estimatedTime: 10,
          order: 1,
          requirements: {},
          isActive: true
        }
      ],
      totalDistance: 0,
      estimatedDuration: 10,
      difficulty: 'medium',
      securityLevel: 'medium',
      isActive: true,
      createdBy: createdByUser._id
    });
    console.log('✅ Created covering route for Satellite area');

    // Get current incidents
    const incidents = await Incident.find({status: {$in: ['reported', 'investigating']}});
    console.log('\n=== Current Incidents ===');
    incidents.forEach(inc => {
      console.log(`- ${inc.title} at ${inc.area} (${inc.severity} severity)`);
      if (inc.coordinates) {
        console.log(`  Coordinates: ${inc.coordinates.latitude}, ${inc.coordinates.longitude}`);
      }
    });

    // Get current routes
    const routes = await PatrolRoute.find({isActive: true});
    console.log('\n=== Current Routes ===');
    routes.forEach(route => {
      console.log(`- ${route.name} (${route.checkpoints.length} checkpoints)`);
      route.checkpoints.forEach(cp => {
        console.log(`  * ${cp.name} at ${cp.coordinates.latitude}, ${cp.coordinates.longitude}`);
      });
    });

    // Test AI scheduler with createMissingRoutes = true
    console.log('\n=== Testing AI Scheduler with Route Coverage Check ===');
    const result = await aiScheduler.generatePatrolAssignments({
      maxRoutes: 10,
      createMissingRoutes: true
    });

    console.log(`\n=== Results ===`);
    console.log(`Assignments generated: ${result.data.assignments.length}`);
    console.log(`Routes created: ${result.data.summary.routesCreated}`);

    if (result.data.newlyCreatedRoutes && result.data.newlyCreatedRoutes.length > 0) {
      console.log('\n=== Newly Created Routes ===');
      result.data.newlyCreatedRoutes.forEach((routeInfo, index) => {
        console.log(`${index + 1}. ${routeInfo.route.name}`);
        console.log(`   Reason: ${routeInfo.reason}`);
        console.log(`   For incident: ${routeInfo.incident.title} (${routeInfo.incident.severity})`);
      });
    } else {
      console.log('\n⚠️  No new routes were created - all incidents are already covered!');
    }

    // Check final routes
    const finalRoutes = await PatrolRoute.find({isActive: true});
    console.log('\n=== Final Routes ===');
    console.log(`Total routes: ${finalRoutes.length}`);
    finalRoutes.forEach(route => {
      console.log(`- ${route.name}`);
      if (route.incidentSeverity) {
        console.log(`  Incident: ${route.incidentTitle} (${route.incidentSeverity} severity)`);
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

testRouteCoverage(); 