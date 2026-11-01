const mongoose = require('mongoose');

const breathingSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    },
    cycles: {
        type: Number,
        default: 4
    },
    followedByGrounding: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BreathingSession', breathingSessionSchema);
