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
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('VideoJob', videoJobSchema);
