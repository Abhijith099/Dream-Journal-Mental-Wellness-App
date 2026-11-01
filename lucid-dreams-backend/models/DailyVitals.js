const mongoose = require('mongoose');

const dailyVitalsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: String, // 'YYYY-MM-DD'
        required: true
    },
    sleepMinutes: {
        type: Number,
        default: 0
    },
    steps: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index to ensure only one document per user per day
dailyVitalsSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyVitals', dailyVitalsSchema);
