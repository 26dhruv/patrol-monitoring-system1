const mongoose = require('mongoose');
const PatrolRoute = require('./models/PatrolRoute');

async function dropCheckpointsIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    const indexes = await PatrolRoute.collection.indexes();
    for (const idx of indexes) {
      if (Object.keys(idx.key).some(k => k.startsWith('checkpoints'))) {
        console.log('Dropping index:', idx.name);
        await PatrolRoute.collection.dropIndex(idx.name);
      }
    }

    await mongoose.connection.close();
    console.log('Done.');
  } catch (error) {
    console.error('Error dropping indexes:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

dropCheckpointsIndexes(); 