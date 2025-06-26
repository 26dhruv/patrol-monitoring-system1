const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const PatrolRoute = require('./models/PatrolRoute');
const User = require('./models/User');
const aiScheduler = require('./services/aiScheduler');

async function testAIScheduler() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Check existing incidents
    const incidents = await Incident.find({status: {$in: ['reported', 'investigating']}});
    console.log('\n=== Open Incidents ===');
    console.log('Total open incidents:', incidents.length);
    incidents.forEach(inc => {
      console.log(`- ${inc.title} at ${inc.area} (${inc.severity} severity)`);
      if (inc.coordinates) {
        console.log(`  Coordinates: ${inc.coordinates.latitude}, ${inc.coordinates.longitude}`);
      }
    });

    // Check existing routes
    const routes = await PatrolRoute.find({isActive: true});
    console.log('\n=== Existing Routes ===');
    console.log('Total active routes:', routes.length);
    routes.forEach(route => {
      console.log(`- ${route.name} (${route.checkpoints.length} checkpoints)`);
      route.checkpoints.forEach(cp => {
        console.log(`  * ${cp.name} at ${cp.coordinates.latitude}, ${cp.coordinates.longitude}`);
      });
    });

    // Check available officers
    const officers = await User.find({role: 'officer', status: {$in: ['active', 'on-duty']}});
    console.log('\n=== Available Officers ===');
    console.log('Total available officers:', officers.length);
    officers.forEach(officer => {
      console.log(`- ${officer.name} (${officer.status})`);
    });

    if (officers.length === 0) {
      console.log('\n❌ No available officers found. Creating a test officer...');
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

    // Test AI scheduler without creating missing routes
    console.log('\n=== Testing AI Scheduler (without createMissingRoutes) ===');
    const result1 = await aiScheduler.generatePatrolAssignments({
      maxRoutes: 3,
      createMissingRoutes: false
    });
    console.log('Assignments generated:', result1.data.assignments.length);
    console.log('Routes created:', result1.data.summary.routesCreated);

    // Test AI scheduler with creating missing routes
    console.log('\n=== Testing AI Scheduler (with createMissingRoutes) ===');
    const result2 = await aiScheduler.generatePatrolAssignments({
      maxRoutes: 5,
      createMissingRoutes: true
    });
    console.log('Assignments generated:', result2.data.assignments.length);
    console.log('Routes created:', result2.data.summary.routesCreated);

    if (result2.data.newlyCreatedRoutes && result2.data.newlyCreatedRoutes.length > 0) {
      console.log('\n=== Newly Created Routes ===');
      result2.data.newlyCreatedRoutes.forEach((routeInfo, index) => {
        console.log(`${index + 1}. ${routeInfo.route.name}`);
        console.log(`   Description: ${routeInfo.route.description}`);
        console.log(`   Reason: ${routeInfo.reason}`);
        console.log(`   For incident: ${routeInfo.incident.title}`);
        console.log(`   Checkpoints: ${routeInfo.route.checkpoints.length}`);
        routeInfo.route.checkpoints.forEach(cp => {
          console.log(`     * ${cp.name} at ${cp.coordinates.latitude}, ${cp.coordinates.longitude}`);
        });
      });
    } else {
      console.log('\n⚠️  No new routes were created. This could mean:');
      console.log('   - All incidents are already covered by existing routes');
      console.log('   - No open incidents with coordinates');
      console.log('   - Incidents are too close to existing route checkpoints (within 500m)');
    }

    // Check updated routes
    const updatedRoutes = await PatrolRoute.find({isActive: true});
    console.log('\n=== Updated Routes ===');
    console.log('Total active routes:', updatedRoutes.length);
    console.log('New routes added:', updatedRoutes.length - routes.length);

    // Show all assignments
    if (result2.data.assignments.length > 0) {
      console.log('\n=== Generated Assignments ===');
      result2.data.assignments.forEach((assignment, index) => {
        console.log(`${index + 1}. Route: ${assignment.route.name}`);
        console.log(`   Officer: ${assignment.officer.name}`);
        console.log(`   Score: ${assignment.score.toFixed(2)}`);
        console.log(`   Incidents nearby: ${assignment.incidentPriority.incidentCount}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

testAIScheduler(); 