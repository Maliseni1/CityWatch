const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  title: { type: String, required: true },       // e.g., "Pothole on Main St"
  description: { type: String, required: true }, // e.g., "Deep hole, caused flat tire"
  location: { type: String, required: true },    // e.g., "Main St & 5th Ave"
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Resolved'], 
    default: 'Open' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', IncidentSchema);