const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');

async function clearAllCheckpoints() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    const result = await PatrolRoute.updateMany({}, { $set: { checkpoints: [] } });
    console.log(`Cleared checkpoints from ${result.modifiedCount || result.nModified} patrol routes.`);

    await mongoose.connection.close();
    console.log('Done.');
  } catch (error) {
    console.error('Error clearing checkpoints:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

clearAllCheckpoints(); 