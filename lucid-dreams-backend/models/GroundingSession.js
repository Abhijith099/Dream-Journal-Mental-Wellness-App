const mongoose = require('mongoose');

const groundingSessionSchema = new mongoose.Schema({
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
    technique: {
        type: String,
        default: "5-4-3-2-1"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GroundingSession', groundingSessionSchema);
