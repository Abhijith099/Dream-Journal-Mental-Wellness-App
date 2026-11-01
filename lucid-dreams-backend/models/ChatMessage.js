const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    flaggedRisk: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Compound index on { userId: 1, sessionId: 1, createdAt: 1 }
chatMessageSchema.index({ userId: 1, sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
