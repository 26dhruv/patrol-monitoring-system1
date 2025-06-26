const mongoose = require('mongoose');
const Patrol = require('./models/Patrol');

async function removeAllPatrols() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Count patrols before deletion
    const patrolCount = await Patrol.countDocuments();
    console.log(`Found ${patrolCount} patrols in the database`);

    if (patrolCount === 0) {
      console.log('No patrols to delete.');
      await mongoose.connection.close();
      return;
    }

    // Delete all patrols
    const result = await Patrol.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} patrols`);

    // Verify deletion
    const remainingPatrols = await Patrol.countDocuments();
    console.log(`Remaining patrols: ${remainingPatrols}`);

    await mongoose.connection.close();
    console.log('✅ All patrols removed successfully!');
  } catch (error) {
    console.error('❌ Error removing patrols:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

removeAllPatrols(); 