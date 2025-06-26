const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');

async function dropAllPatrolRouteIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Drop all indexes except _id
    await PatrolRoute.collection.dropIndexes();
    console.log('Dropped all indexes on patrolroutes collection');

    await mongoose.connection.close();
    console.log('Done.');
  } catch (error) {
    console.error('Error dropping indexes:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

dropAllPatrolRouteIndexes(); 