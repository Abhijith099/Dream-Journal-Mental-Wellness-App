const mongoose = require('mongoose');

const dailyCheckInSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: String, // 'YYYY-MM-DD'
        required: true,
        index: true
    },
    mentalState: {
        type: String,
        enum: ['Clear', 'Foggy', 'Overloaded', 'Numb', null],
        default: null
    },
    bodyState: {
        type: String,
        enum: ['Settled', 'Tense', 'Restless', 'Heavy', null],
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// One check-in per user per date, with latest timestamp indexed
dailyCheckInSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyCheckInSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('DailyCheckIn', dailyCheckInSchema);
