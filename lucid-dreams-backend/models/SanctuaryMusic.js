const mongoose = require('mongoose');

const sanctuaryMusicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  trackTitle: { type: String, required: true }, // e.g. "Gentle Cello & Rain"
  artist: { type: String, default: 'Spotify Linked • 432 Hz Tuned' },
  source: { type: String, enum: ['spotify', 'local_file', 'uploaded'], default: 'spotify' },
  spotifyTrackId: { type: String, default: '' },
  audioUrl: { type: String, default: '' },
  albumArtUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  playbackCount: { type: Number, default: 4 },
  averageEffectiveness: { type: Number, default: 0.50 }, // 50% calmer
  dateLinked: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SanctuaryMusic', sanctuaryMusicSchema);
