const mongoose = require('mongoose');

const heartRateLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bpm: {
    type: Number,
    required: true
  },
  quality: {
    type: String,
    enum: ['valid', 'invalid'],
    required: true
  },
  context: {
    type: String,
    enum: ['pre-journal', 'post-journal', 'standalone'],
    default: 'standalone'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

heartRateLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HeartRateLog', heartRateLogSchema);
