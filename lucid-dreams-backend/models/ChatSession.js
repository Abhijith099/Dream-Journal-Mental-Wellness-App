const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
