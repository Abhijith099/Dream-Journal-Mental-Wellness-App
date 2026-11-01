const mongoose = require('mongoose');

const weeklyDigestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    digestText: { type: String, required: true },
    generationDate: { type: Date, default: Date.now }
});

weeklyDigestSchema.index({ userId: 1, generationDate: -1 });

module.exports = mongoose.model('WeeklyDigest', weeklyDigestSchema);
