const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Witness schema for people who witnessed the incident
const WitnessSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    trim: true
  },
  statement: {
    type: String,
    trim: true
  }
});

// Involved person schema for people involved in the incident
const InvolvedPersonSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['victim', 'suspect', 'witness', 'other'],
    default: 'other'
  }
});

// Note schema for keeping track of case notes
const NoteSchema = new Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Action schema for tracking actions taken
const ActionSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  takenBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Main Incident schema
const IncidentSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Please provide incident title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide incident description'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Please provide incident date'],
    default: Date.now
  },
  time: {
    type: String,
    trim: true
  },
  area: {
    type: String,
    required: [true, 'Please provide incident area name'],
    trim: true
  },
  category: {
    type: String,
    enum: ['security', 'maintenance', 'medical', 'fire', 'theft', 'vandalism', 'trespassing', 'other'],
    required: [true, 'Please select incident category']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  witnesses: [WitnessSchema],
  involvedPersons: [InvolvedPersonSchema],
  notes: [NoteSchema],
  actions: [ActionSchema],
}, { timestamps: true });

// Pre-save hook to ensure date is properly formatted
IncidentSchema.pre('save', function(next) {
  // Convert string date to Date object if needed
  if (typeof this.date === 'string') {
    this.date = new Date(this.date);
  }
  
  next();
});

// Virtual property for report number
IncidentSchema.virtual('reportNumber').get(function() {
  return `IR-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Set toJSON option to include virtuals
IncidentSchema.set('toJSON', { virtuals: true });
IncidentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Incident', IncidentSchema); 