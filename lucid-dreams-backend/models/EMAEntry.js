const mongoose = require('mongoose');

const emaEntrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mood: { 
        type: String, 
        enum: ['calm', 'okay', 'tense', 'low', 'heavy'], 
        required: true 
    },
    energyLevel: { 
        type: Number, 
        min: 1, 
        max: 5, 
        required: true 
    },
    question: { 
        type: String, 
        required: true 
    },
    triggeredBy: { 
        type: String, 
        enum: ['notification', 'app_open', 'manual'], 
        default: 'app_open' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true
});

emaEntrySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('EMAEntry', emaEntrySchema);
