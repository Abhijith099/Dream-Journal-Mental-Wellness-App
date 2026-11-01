const mongoose = require('mongoose');

const companionSessionSchema = new mongoose.Schema({
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
    startedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

companionSessionSchema.index({ userId: 1, sessionId: 1 });

module.exports = mongoose.model('CompanionSession', companionSessionSchema);
