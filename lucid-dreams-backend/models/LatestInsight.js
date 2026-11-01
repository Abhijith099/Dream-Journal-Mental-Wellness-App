const mongoose = require('mongoose');

const latestInsightSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
        unique: true
    },
    text: {
        type: String,
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    dreamCountAtGeneration: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LatestInsight', latestInsightSchema);
