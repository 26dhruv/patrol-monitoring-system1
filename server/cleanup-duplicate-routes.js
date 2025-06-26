const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');

async function cleanupDuplicateRoutes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Find all routes
    const allRoutes = await PatrolRoute.find({});
    console.log(`Total routes found: ${allRoutes.length}`);

    // Group routes by name
    const routeGroups = {};
    allRoutes.forEach(route => {
      if (!routeGroups[route.name]) {
        routeGroups[route.name] = [];
      }
      routeGroups[route.name].push(route);
    });

    // For each group, keep the one with checkpoints, delete the ones without
    let deletedCount = 0;
    for (const [routeName, routes] of Object.entries(routeGroups)) {
      if (routes.length > 1) {
        console.log(`Found ${routes.length} routes with name: ${routeName}`);
        
        // Find routes with and without checkpoints
        const routesWithCheckpoints = routes.filter(r => r.checkpoints.length > 0);
        const routesWithoutCheckpoints = routes.filter(r => r.checkpoints.length === 0);
        
        console.log(`  - Routes with checkpoints: ${routesWithCheckpoints.length}`);
        console.log(`  - Routes without checkpoints: ${routesWithoutCheckpoints.length}`);
        
        // Delete routes without checkpoints
        for (const route of routesWithoutCheckpoints) {
          await PatrolRoute.findByIdAndDelete(route._id);
          deletedCount++;
          console.log(`  - Deleted route: ${route._id}`);
        }
      }
    }

    console.log(`\nDeleted ${deletedCount} duplicate routes without checkpoints`);
    
    // Show final count
    const finalRoutes = await PatrolRoute.find({});
    console.log(`Final route count: ${finalRoutes.length}`);
    
    finalRoutes.forEach(route => {
      console.log(`- ${route.name} (${route.checkpoints.length} checkpoints)`);
    });

    await mongoose.connection.close();
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

cleanupDuplicateRoutes(); 