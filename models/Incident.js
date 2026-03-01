const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, default: 'General' },
  status: { type: String, default: 'Open' }, 
  user: { type: String }, 
  city: { type: String, required: true }, // <--- NEW: Incident assigned to a city
  isAnonymous: { type: Boolean, default: false }, 
  imageUrl: { type: String },
  upvotes: [{ type: String }] 
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);