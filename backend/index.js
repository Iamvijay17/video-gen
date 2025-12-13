const express = require('express');
const connectDB = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Routes
const videoRoutes = require('./src/api/video');
const ttsRoutes = require('./src/api/tts');
app.use('/api/video', videoRoutes);
app.use('/api/tts', ttsRoutes);

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
