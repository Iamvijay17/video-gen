const mongoose = require('mongoose');

const ttsRequestSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  lang: {
    type: String,
    default: 'en',
  },
  fileId: {
    type: String,
    required: true,
    unique: true,
  },
  filename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('TTSRequest', ttsRequestSchema);
