const mongoose = require('mongoose');

const doneItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskText: { type: String, required: true },
    category: { type: String, default: 'General' },
    masteryScore: { type: Number, min: 1, max: 5 },
    pleasureScore: { type: Number, min: 1, max: 5 },
    completedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

doneItemSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DoneItem', doneItemSchema);
