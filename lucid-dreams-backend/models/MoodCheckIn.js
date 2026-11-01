const mongoose = require('mongoose');

const moodCheckInSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    },
    mood: { 
        type: String, 
        enum: ['calm', 'okay', 'tense', 'low', 'overwhelmed', 'Clear', 'Foggy', 'Heavy'], 
        required: true 
    }
}, {
    timestamps: true
});

// Compound index as requested: { userId: 1, createdAt: -1 }
moodCheckInSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MoodCheckIn', moodCheckInSchema);
