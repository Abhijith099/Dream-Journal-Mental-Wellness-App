const mongoose = require('mongoose');

const audioResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ['meditation', 'soundscape', 'talk', 'micro_step'] 
    },
    audioUrl: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    voiceType: { type: String, default: 'female_soothing' }
}, {
    timestamps: true
});

module.exports = mongoose.model('AudioResource', audioResourceSchema);
