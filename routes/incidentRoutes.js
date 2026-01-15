const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');

// CREATE: Report a new incident 
router.post('/', async (req, res) => {
  try {
    const newIncident = new Incident(req.body);
    const savedIncident = await newIncident.save();

    // EMIT EVENT: Tell everyone a new incident happened
    req.io.emit('new_incident', savedIncident); 

    res.status(201).json(savedIncident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ: Get all incidents 
router.get('/', async (req, res) => {
  try {
    const incidents = await Incident.find();
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

module.exports = router;