const mongoose = require('mongoose');

const observationCacheSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    period: { type: String, required: true },
    text: { type: String, required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    dreamCountAtGeneration: { type: Number, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('ObservationCache', observationCacheSchema);
