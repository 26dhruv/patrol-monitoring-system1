const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const User = require('./models/User');

async function createTestIncidents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/patrol-monitoring');
    console.log('Connected to MongoDB');

    // Delete existing incidents
    await Incident.deleteMany({});
    console.log('🗑️  Deleted existing incidents');

    // Get a user to use as reportedBy
    const user = await User.findOne({role: 'officer'});
    if (!user) {
      console.log('❌ No officer found. Creating a test officer...');
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

    const reportedByUser = user || await User.findOne({role: 'officer'});

    // Create test incidents with coordinates far apart
    const testIncidents = [
      {
        title: 'Suspicious Activity at Satellite Road',
        description: 'Reports of suspicious individuals loitering around residential area',
        area: 'Satellite',
        coordinates: {
          latitude: 23.0225,
          longitude: 72.5714
        },
        severity: 'high',
        status: 'reported',
        category: 'security',
        reportedBy: reportedByUser._id,
        witnesses: [
          {
            name: 'John Doe',
            contact: '9876543210',
            statement: 'Saw two suspicious individuals loitering around the residential area'
          },
          {
            name: 'Jane Smith',
            contact: '9876543211',
            statement: 'Noticed unusual activity near the park entrance'
          }
        ],
        involvedPersons: [
          {
            name: 'Unknown Individual 1',
            description: 'Tall male in dark clothing',
            role: 'suspect'
          },
          {
            name: 'Unknown Individual 2',
            description: 'Medium height male in blue jacket',
            role: 'suspect'
          }
        ]
      },
      {
        title: 'Medical Emergency at Law Garden',
        description: 'Person collapsed near the garden entrance',
        area: 'Law Garden',
        coordinates: {
          latitude: 23.0333,
          longitude: 72.5833
        },
        severity: 'critical',
        status: 'investigating',
        category: 'medical',
        reportedBy: reportedByUser._id,
        witnesses: [
          {
            name: 'Garden Staff',
            contact: '9876543212',
            statement: 'Person collapsed suddenly near the main entrance'
          }
        ],
        involvedPersons: [
          {
            name: 'Victim',
            description: 'Middle-aged person who collapsed',
            role: 'victim'
          }
        ]
      },
      {
        title: 'Vehicle Theft at Ahmedabad Railway Station',
        description: 'Motorcycle stolen from parking area',
        area: 'Ahmedabad Railway Station',
        coordinates: {
          latitude: 23.0258,
          longitude: 72.5875
        },
        severity: 'medium',
        status: 'reported',
        category: 'theft',
        reportedBy: reportedByUser._id,
        witnesses: [
          {
            name: 'Parking Attendant',
            contact: '9876543213',
            statement: 'Saw someone suspicious near the motorcycle parking area'
          }
        ],
        involvedPersons: [
          {
            name: 'Vehicle Owner',
            description: 'Person who reported the theft',
            role: 'victim'
          },
          {
            name: 'Unknown Thief',
            description: 'Person who stole the motorcycle',
            role: 'suspect'
          }
        ]
      },
      {
        title: 'Fire Alarm at Mansi Circle',
        description: 'Fire alarm triggered in commercial building',
        area: 'Mansi Circle',
        coordinates: {
          latitude: 23.0150,
          longitude: 72.5950
        },
        severity: 'medium',
        status: 'reported',
        category: 'fire',
        reportedBy: reportedByUser._id,
        witnesses: [
          {
            name: 'Building Security',
            contact: '9876543214',
            statement: 'Fire alarm system triggered automatically'
          }
        ],
        involvedPersons: [
          {
            name: 'Fire Department',
            description: 'Emergency response team',
            role: 'other'
          }
        ]
      },
      {
        title: 'Vandalism at Sabarmati Ashram',
        description: 'Graffiti found on historical building walls',
        area: 'Sabarmati Ashram',
        coordinates: {
          latitude: 23.0600,
          longitude: 72.5800
        },
        severity: 'low',
        status: 'reported',
        category: 'vandalism',
        reportedBy: reportedByUser._id,
        witnesses: [
          {
            name: 'Ashram Staff',
            contact: '9876543215',
            statement: 'Discovered graffiti on the historical building walls'
          },
          {
            name: 'Tourist',
            contact: '9876543216',
            statement: 'Saw the graffiti while visiting the ashram'
          }
        ],
        involvedPersons: [
          {
            name: 'Unknown Vandals',
            description: 'Persons responsible for the graffiti',
            role: 'suspect'
          }
        ]
      }
    ];

    console.log('🌱 Creating test incidents...');
    const createdIncidents = [];
    
    for (const incidentData of testIncidents) {
      const incident = await Incident.create(incidentData);
      createdIncidents.push(incident);
      console.log(`✅ Created incident: ${incident.title} at ${incident.area}`);
    }

    console.log('\n📊 Test Incidents Summary:');
    createdIncidents.forEach(inc => {
      console.log(`- ${inc.area}: ${inc.title} (${inc.severity} severity, ${inc.status})`);
      console.log(`  Coordinates: ${inc.coordinates.latitude}, ${inc.coordinates.longitude}`);
    });

    console.log('\n🎉 Successfully created test incidents!');
    console.log('These incidents are spaced far apart to ensure new routes are created.');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error creating test incidents:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

createTestIncidents(); 