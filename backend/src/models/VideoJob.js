const mongoose = require('mongoose');

const videoJobSchema = new mongoose.Schema({
  compositionId: {
    type: String,
    default: 'HelloWorld',
  },
  inputProps: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      titleText: 'Welcome Vijay',
      titleColor: '#000000',
      logoColor1: '#91EAE4',
      logoColor2: '#86A8E7',
    },
  },
  outputPath: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  error: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
});

// Update the updatedAt field before saving
videoJobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VideoJob', videoJobSchema);
