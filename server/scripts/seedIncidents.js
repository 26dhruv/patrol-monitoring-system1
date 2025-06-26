require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const User = require('../models/User');


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sampleIncidents = [
  {
    title: 'Suspicious Activity at Satellite Road',
    description: 'Multiple individuals loitering around the ISRO Satellite Center area. Security personnel reported unusual behavior near the main entrance.',
    area: 'Satellite',
    coordinates: {
      latitude: 23.0330,
      longitude: 72.5850
    },
    category: 'security',
    severity: 'high',
    status: 'reported',
    time: '14:30',
    witnesses: [
      {
        name: 'Rajesh Patel',
        contact: '+91-9876543210',
        statement: 'Saw 3-4 people taking photos of the building from different angles'
      }
    ],
    involvedPersons: [
      {
        name: 'Unknown individuals',
        description: '3-4 people in casual clothing',
        role: 'suspect'
      }
    ]
  },
  {
    title: 'Medical Emergency at Law Garden',
    description: 'Elderly person collapsed near the main entrance. Immediate medical attention required.',
    area: 'Law Garden',
    coordinates: {
      latitude: 23.0225,
      longitude: 72.5714
    },
    category: 'medical',
    severity: 'critical',
    status: 'investigating',
    time: '18:45',
    witnesses: [
      {
        name: 'Priya Sharma',
        contact: '+91-8765432109',
        statement: 'The person was walking and suddenly fell down. No visible injuries but unconscious.'
      }
    ],
    involvedPersons: [
      {
        name: 'Elderly person (unidentified)',
        description: 'Male, approximately 65-70 years old',
        role: 'victim'
      }
    ]
  },
  {
    title: 'Vehicle Theft at Ahmedabad Railway Station',
    description: 'Motorcycle stolen from parking area near platform 1. Owner reported missing vehicle after returning from trip.',
    area: 'Ahmedabad Railway Station',
    coordinates: {
      latitude: 23.0272644,
      longitude: 72.6015853
    },
    category: 'theft',
    severity: 'medium',
    status: 'investigating',
    time: '09:15',
    witnesses: [
      {
        name: 'Amit Kumar',
        contact: '+91-7654321098',
        statement: 'Saw someone suspicious near the parking area around 9 AM'
      }
    ],
    involvedPersons: [
      {
        name: 'Vehicle owner',
        description: 'Mr. Suresh Mehta - motorcycle owner',
        role: 'victim'
      },
      {
        name: 'Unknown thief',
        description: 'Person seen near parking area',
        role: 'suspect'
      }
    ]
  },
  {
    title: 'Fire Alarm at Mansi Circle',
    description: 'Fire alarm triggered in commercial building. Fire department responded. False alarm confirmed.',
    area: 'Mansi Circle',
    coordinates: {
      latitude: 23.0328215,
      longitude: 72.5253767
    },
    category: 'fire',
    severity: 'medium',
    status: 'resolved',
    time: '11:20',
    witnesses: [
      {
        name: 'Building Security',
        contact: '+91-6543210987',
        statement: 'Alarm went off due to smoke from kitchen in restaurant on 3rd floor'
      }
    ],
    involvedPersons: [
      {
        name: 'Restaurant staff',
        description: 'Kitchen staff at 3rd floor restaurant',
        role: 'other'
      }
    ]
  },
  {
    title: 'Vandalism at Sabarmati Ashram',
    description: 'Graffiti found on the outer wall of the historical site. Security cameras captured the incident.',
    area: 'Sabarmati Ashram',
    coordinates: {
      latitude: 23.0601651,
      longitude: 72.5806382
    },
    category: 'vandalism',
    severity: 'low',
    status: 'reported',
    time: '22:30',
    witnesses: [
      {
        name: 'Security Guard',
        contact: '+91-5432109876',
        statement: 'Found spray paint on the wall during night patrol'
      }
    ],
    involvedPersons: [
      {
        name: 'Unknown vandals',
        description: '2-3 people seen on security footage',
        role: 'suspect'
      }
    ]
  }
];

const seedIncidents = async () => {
  try {
    console.log('🗑️  Deleting all existing incidents...');
    await Incident.deleteMany({});
    console.log('✅ All incidents deleted successfully');

    // Get a user to assign as reporter
    const user = await User.findOne({ role: 'officer' });
    if (!user) {
      console.error('❌ No officer found in database. Please create users first.');
      process.exit(1);
    }

    console.log('🌱 Creating new incidents...');
    
    for (const incidentData of sampleIncidents) {
      const incident = new Incident({
        ...incidentData,
        date: new Date(),
        reportedBy: user._id
      });
      
      await incident.save();
      console.log(`✅ Created incident: ${incident.title} at ${incident.area}`);
    }

    console.log('🎉 Successfully created 5 new incidents with updated logic!');
    console.log('\n📊 Incident Summary:');
    console.log('- Satellite: Security incident (High severity)');
    console.log('- Law Garden: Medical emergency (Critical severity)');
    console.log('- Railway Station: Vehicle theft (Medium severity)');
    console.log('- Mansi Circle: Fire alarm (Medium severity, Resolved)');
    console.log('- Sabarmati Ashram: Vandalism (Low severity)');

  } catch (error) {
    console.error('❌ Error seeding incidents:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeding
seedIncidents(); 