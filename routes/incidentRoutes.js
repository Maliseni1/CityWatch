const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// CREATE: Report a new incident (Protected Route)
router.post('/', async (req, res) => {
  try {
    // 1. SECURITY: Check for the Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    // 2. Verify the Token
    const token = authHeader.split(' ')[1]; // Remove "Bearer "
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // 3. Find the User (to get the correct username)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 4. Create the Incident
    const newIncident = new Incident({
      title: req.body.title,
      location: req.body.location,
      description: req.body.description,
      type: req.body.type || 'General',
      // We save the boolean choice
      isAnonymous: req.body.isAnonymous || false, 
      // We ALWAYS save the real user (for admin safety), 
      // the frontend decides whether to show it or not based on isAnonymous.
      imageUrl: req.body.imageUrl || '',
      user: user.username, 
      status: 'Open'
    });

    const savedIncident = await newIncident.save();

    // 5. EMIT EVENT: Tell everyone a new incident happened
    // Using req.app.get('socketio') is the robust way to access IO in routes
    const io = req.app.get('socketio'); 
    if (io) {
      io.emit('new_incident', savedIncident);
    }

    res.status(201).json(savedIncident);
  } catch (err) {
    console.error("Error creating incident:", err);
    res.status(500).json({ error: err.message });
  }
});

// READ: Get all incidents (Sorted by newest first)
router.get('/', async (req, res) => {
  try {
    // .sort({ createdAt: -1 }) puts the newest reports at the top
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ: Get single incident by ID
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE: Update status (e.g., mark as Resolved) 
router.put('/:id', async (req, res) => {
  try {
    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Return the updated document
    );
    res.json(updatedIncident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Remove an incident 
router.delete('/:id', async (req, res) => {
  try {
    await Incident.findByIdAndDelete(req.params.id);
    res.json({ message: 'Incident deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE UPVOTE: /api/incidents/:id/upvote
router.put('/:id/upvote', async (req, res) => {
  try {
    // 1. Get the user ID from the token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // 2. Find the incident
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Not found' });

    // 3. Check if user already upvoted
    const index = incident.upvotes.indexOf(userId);

    if (index === -1) {
      // Not found? Add them (Upvote)
      incident.upvotes.push(userId);
    } else {
      // Found? Remove them (Un-vote)
      incident.upvotes.splice(index, 1);
    }

    const updatedIncident = await incident.save();
    
    // 4. Notify everyone via Socket
    const io = req.app.get('socketio');
    if (io) io.emit('update_incident', updatedIncident);

    res.json(updatedIncident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;