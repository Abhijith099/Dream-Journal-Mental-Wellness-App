const mongoose = require('mongoose');

const wellnessLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    sleepMinutes: { type: Number, default: 0 },
    steps: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Enforce one log per user per day
wellnessLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WellnessLog', wellnessLogSchema);
