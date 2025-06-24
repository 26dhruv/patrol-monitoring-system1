require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// MongoDB URI - use environment variable
const MONGO_URI = process.env.MONGO_URI ;

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Connect to database
    await connectDB();

    // Define sample users
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        phone: '555-123-4567',
        badgeNumber: 'ADMIN001',
        department: 'Administration',
        status: 'active'
      },
      {
        name: 'Manager User',
        email: 'manager@example.com',
        password: 'password123',
        role: 'manager',
        phone: '555-234-5678',
        badgeNumber: 'MGR001',
        department: 'Operations',
        status: 'active'
      },
      {
        name: 'Officer One',
        email: 'officer1@example.com',
        password: 'password123',
        role: 'officer',
        phone: '555-345-6789',
        badgeNumber: 'OFF001',
        department: 'Security',
        status: 'active'
      },
      {
        name: 'Officer Two',
        email: 'officer2@example.com',
        password: 'password123',
        role: 'officer',
        phone: '555-456-7890',
        badgeNumber: 'OFF002',
        department: 'Security',
        status: 'active'
      }
    ];

    // Clear existing users
    await User.deleteMany({});
    console.log('Existing users deleted');

    // Insert new users
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users created`);
    
    // Output the user info
    createdUsers.forEach(user => {
      console.log(`Created ${user.role}: ${user.email} (password: password123)`);
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedUsers(); 