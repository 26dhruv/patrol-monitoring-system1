const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing demo users
    await User.deleteMany({ 
      email: { $in: ['admin@patrol.com', 'officer@patrol.com', 'manager@patrol.com'] } 
    });

    // Create demo users
    const demoUsers = [
      {
        name: 'Admin User',
        email: 'admin@patrol.com',
        password: 'admin123',
        role: 'admin',
        phone: '+1234567890',
        badgeNumber: 'ADM001',
        status: 'active',
        department: 'Administration'
      },
      {
        name: 'Officer John',
        email: 'officer@patrol.com',
        password: 'officer123',
        role: 'officer',
        phone: '+1234567891',
        badgeNumber: 'OFF001',
        status: 'on-duty',
        department: 'Security'
      },
      {
        name: 'Manager Smith',
        email: 'manager@patrol.com',
        password: 'manager123',
        role: 'manager',
        phone: '+1234567892',
        badgeNumber: 'MGR001',
        status: 'active',
        department: 'Operations'
      }
    ];

    // Insert demo users
    const createdUsers = await User.create(demoUsers);
    console.log('Demo users created successfully:');
    createdUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers(); 