const mongoose = require('mongoose');

const thoughtRecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    situation: { type: String, required: true },
    automaticThought: { type: String, required: true },
    distortion: { type: String, required: true },
    rationalResponse: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('ThoughtRecord', thoughtRecordSchema);
