const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');

async function fixPatrolRouteIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Get all current indexes
    const indexes = await PatrolRoute.collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop all indexes except the default _id index
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        console.log(`Dropping index: ${idx.name}`);
        try {
          await PatrolRoute.collection.dropIndex(idx.name);
        } catch (error) {
          console.log(`Could not drop index ${idx.name}:`, error.message);
        }
      }
    }

    // Verify indexes are dropped
    const remainingIndexes = await PatrolRoute.collection.indexes();
    console.log('Remaining indexes after dropping:', remainingIndexes.map(idx => idx.name));

    // Create a simple, clean index on name field only
    try {
      await PatrolRoute.collection.createIndex({ name: 1 }, { unique: true });
      console.log('✅ Created clean index on name field');
    } catch (error) {
      console.log('Could not create unique index on name:', error.message);
      // Create non-unique index instead
      await PatrolRoute.collection.createIndex({ name: 1 });
      console.log('✅ Created non-unique index on name field');
    }

    // Verify final indexes
    const finalIndexes = await PatrolRoute.collection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => idx.name));

    await mongoose.connection.close();
    console.log('✅ Patrol route indexes fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

fixPatrolRouteIndexes(); 