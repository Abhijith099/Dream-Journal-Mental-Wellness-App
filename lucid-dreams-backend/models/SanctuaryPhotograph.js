const mongoose = require('mongoose');

const sanctuaryPhotographSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  imageName: { type: String, required: true }, // e.g. "Sarah & Grandkids", "Family Garden in Summer"
  locationContext: { type: String, default: 'Family Gathering • Living Room' },
  imageUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String, default: '' },
  viewCount: { type: Number, default: 6 },
  averageEffectiveness: { type: Number, default: 0.66 }, // 66% calmer
  dateUploaded: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SanctuaryPhotograph', sanctuaryPhotographSchema);
