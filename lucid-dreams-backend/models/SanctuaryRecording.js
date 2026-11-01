const mongoose = require('mongoose');

const sanctuaryRecordingSchema = new mongoose.Schema({
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'SanctuaryContact', required: false, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Soothing message' },
  creatorName: { type: String, default: 'Sarah' },
  relationship: { type: String, default: 'Daughter' },
  audioUrl: { type: String, required: true },
  durationSeconds: { type: Number, required: true },
  recordingLabel: { type: String, default: '1m 45s soothing message' },
  recordedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  isSample: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String, default: '' },
  flaggedAt: { type: Date },
  playbackCount: { type: Number, default: 12 },
  averageEffectiveness: { type: Number, default: 0.83 }, // e.g. 83% calmer
  contentNotes: { type: String, default: '' }
});

module.exports = mongoose.model('SanctuaryRecording', sanctuaryRecordingSchema);
