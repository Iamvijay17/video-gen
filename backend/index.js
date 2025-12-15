const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');
const { initializeBuckets } = require('./src/config/minio');
// Trigger restart

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB().catch(err => console.error('Database connection failed:', err));

// Initialize MinIO buckets
initializeBuckets().catch(err => console.error('MinIO initialization failed:', err));

// CORS middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative frontend port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());

// Static file serving for storage
app.use('/storage', express.static('../storage'));

// Routes
const videoRoutes = require('./src/api/video');
const ttsRoutes = require('./src/api/tts');
const storageRoutes = require('./src/api/storage');
app.use('/api/video', videoRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/storage', storageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
