const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// CREATE: Report a new incident (Protected Route)
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization token missing' });

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newIncident = new Incident({
      title: req.body.title,
      location: req.body.location,
      description: req.body.description,
      type: req.body.type || 'General',
      isAnonymous: req.body.isAnonymous || false, 
      imageUrl: req.body.imageUrl || '',
      user: user.username,
      city: user.city, // <--- NEW: Automatically tie to user's city
      status: 'Open'
    });

    const savedIncident = await newIncident.save();

    // NEW: Emit event ONLY to users in that specific city's room
    if (req.io) {
      req.io.to(user.city).emit('new_incident', savedIncident);
    }

    res.status(201).json(savedIncident);
  } catch (err) {
    console.error("Error creating incident:", err);
    res.status(500).json({ error: err.message });
  }
});

// READ: Get all incidents (Sorted by newest first & Filtered by City)
router.get('/', async (req, res) => {
  try {
    let query = {}; // Default query

    // NEW: Check token to filter incidents by the user's city
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.city) {
          query.city = decoded.city; // Only fetch incidents for this city
        }
      } catch (err) { /* Token invalid, fallback to empty query */ }
    }

    const incidents = await Incident.find(query).sort({ createdAt: -1 });
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

// UPDATE: Update status
router.put('/:id', async (req, res) => {
  try {
    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } 
    );
    // Notify the city room
    if (req.io && updatedIncident) {
      req.io.to(updatedIncident.city).emit('update_incident', updatedIncident);
    }
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

// TOGGLE UPVOTE
router.put('/:id/upvote', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Not found' });

    const index = incident.upvotes.indexOf(userId);

    if (index === -1) {
      incident.upvotes.push(userId);
    } else {
      incident.upvotes.splice(index, 1);
    }

    const updatedIncident = await incident.save();
    
    // NEW: Notify only the city room
    if (req.io) {
      req.io.to(updatedIncident.city).emit('update_incident', updatedIncident);
    }

    res.json(updatedIncident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;