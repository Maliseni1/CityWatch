require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 1. Import CORS
const mongoose = require('mongoose');
const incidentRoutes = require('./routes/incidentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 2. USE CORS (Critical Step: Add this line)
// This allows your frontend (running on a different port/file) to talk to this backend
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/citywatch')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB Connection Error:', err));

// Routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/auth', authRoutes);

// Basic Error Handling 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});