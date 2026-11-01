const mongoose = require('mongoose');

const wellnessContentSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['meditation', 'sound', 'talk', 'video'], 
        required: true 
    },
    title: { type: String, required: true },
    description: { type: String },
    durationSeconds: { type: Number, required: true },
    mediaUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    category: { type: String, required: true },
    order: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('WellnessContent', wellnessContentSchema);
