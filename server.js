require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); 
const { Server } = require('socket.io'); 

const incidentRoutes = require('./routes/incidentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CONFIGURATION: ALLOWED ORIGINS ---
// This single list controls access for both the API and WebSockets.
// I added your specific Vercel URL here to fix the CORS error.
const allowedOrigins = [
  "http://localhost:5173",                 // Local Development
  "http://localhost:5174",                 // Local Development (alternative port)
  "https://city-watch-kappa.vercel.app",   // YOUR VERCEL FRONTEND
  process.env.FRONTEND_URL                 // Extra flexibility via .env
].filter(Boolean); // Removes empty values if .env is missing

// --- 2. HTTP SERVER & SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- 3. MIDDLEWARE ---
// Use the same 'allowedOrigins' list for Express CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Pass 'io' to every request so controllers can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- 4. DATABASE ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/citywatch')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB Connection Error:', err));

// --- 5. ROUTES ---
app.use('/api/incidents', incidentRoutes);
app.use('/api/auth', authRoutes);

// Socket.io Events
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});