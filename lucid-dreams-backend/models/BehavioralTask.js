const mongoose = require('mongoose');

const behavioralTaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('BehavioralTask', behavioralTaskSchema);
