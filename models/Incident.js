const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, default: 'General' },
  status: { type: String, default: 'Open' }, // Open, In Progress, Resolved
  user: { type: String }, // The username of the reporter
  isAnonymous: { type: Boolean, default: false }, // <--- NEW: Stores if they want to be hidden
  imageUrl: { type: String },
  upvotes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);