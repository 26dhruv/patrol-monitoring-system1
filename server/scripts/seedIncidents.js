require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;

// Sample incidents data for Ahmedabad
const sampleIncidents = [
  {
    title: 'Suspicious Activity at Law Garden',
    description: 'Multiple reports of suspicious individuals loitering around Law Garden area',
    category: 'security',
    severity: 'medium',
    status: 'new',
    date: new Date(),
    time: '14:30',
    area: 'Law Garden',
    reportedBy: null, // Will be set to first user
    assignedTo: [],
    notes: [{
      content: 'Area needs increased patrol presence',
      addedBy: null // Will be set to first user
    }]
  },
  {
    title: 'Traffic Violation at Satellite',
    description: 'Reckless driving and traffic rule violations reported in Satellite area',
    category: 'other',
    severity: 'high',
    status: 'in-progress',
    date: new Date(),
    time: '16:45',
    area: 'Satellite',
    reportedBy: null,
    assignedTo: [],
    notes: [{
      content: 'Requires immediate attention from traffic police',
      addedBy: null
    }]
  },
  {
    title: 'Vandalism at Vastrapur Lake',
    description: 'Public property vandalism reported near Vastrapur Lake',
    category: 'vandalism',
    severity: 'low',
    status: 'new',
    date: new Date(),
    time: '09:15',
    area: 'Vastrapur Lake',
    reportedBy: null,
    assignedTo: [],
    notes: [{
      content: 'Minor damage to park benches',
      addedBy: null
    }]
  },
  {
    title: 'Medical Emergency at Navrangpura',
    description: 'Medical emergency requiring police assistance for traffic management',
    category: 'medical',
    severity: 'critical',
    status: 'new',
    date: new Date(),
    time: '11:20',
    area: 'Navrangpura',
    reportedBy: null,
    assignedTo: [],
    notes: [{
      content: 'Ambulance stuck in traffic, need police escort',
      addedBy: null
    }]
  },
  {
    title: 'Theft Attempt at CG Road',
    description: 'Attempted theft reported at commercial establishment on CG Road',
    category: 'theft',
    severity: 'medium',
    status: 'in-progress',
    date: new Date(),
    time: '13:10',
    area: 'CG Road',
    reportedBy: null,
    assignedTo: [],
    notes: [{
      content: 'Suspects fled the scene, area needs monitoring',
      addedBy: null
    }]
  }
];

async function seedIncidents() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);

    // Clear existing incidents
    await Incident.deleteMany({});
    console.log('🗑️  Cleared existing incidents');

    // Get first user as reporter
    const firstUser = await User.findOne();
    if (!firstUser) {
      throw new Error('No users found in database. Please run seedUsers.js first.');
    }

    // Get first location for incidents
    const Location = require('../models/Location');
    const firstLocation = await Location.findOne();
    if (!firstLocation) {
      console.log('⚠️  No locations found. Creating incidents without location reference.');
    }

    // Create incidents with proper references
    const incidentsWithRefs = sampleIncidents.map(incident => ({
      ...incident,
      reportedBy: firstUser._id,
      notes: incident.notes.map(note => ({
        ...note,
        addedBy: firstUser._id
      }))
    }));

    const createdIncidents = await Incident.insertMany(incidentsWithRefs);
    console.log(`✅ Created ${createdIncidents.length} sample incidents`);

    // Display created incidents
    console.log('\n📋 Created Incidents:');
    createdIncidents.forEach((incident, index) => {
      console.log(`${index + 1}. ${incident.title} (${incident.severity} priority) - ${incident.status}`);
    });

    console.log('\n🎉 Incident seeding completed successfully!');
    console.log('💡 These incidents will be used by the AI scheduler for route prioritization.');

  } catch (error) {
    console.error('❌ Error seeding incidents:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding function
seedIncidents(); 