require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 
const passport = require('passport');

const incidentRoutes = require('./routes/incidentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",                 
  "http://localhost:5174",                 
  "https://city-watch-kappa.vercel.app",   
  process.env.FRONTEND_URL                 
].filter(Boolean); 

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(passport.initialize());
app.use(express.json());

// Expose io to req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/citywatch')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB Connection Error:', err));

app.use('/api/incidents', incidentRoutes);
app.use('/api/auth', authRoutes);

// --- NEW: Socket.io Room Logic ---
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User tells server which city they belong to
  socket.on('join_city', (city) => {
    if (city) {
      socket.join(city);
      console.log(`Socket ${socket.id} joined city room: ${city}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});