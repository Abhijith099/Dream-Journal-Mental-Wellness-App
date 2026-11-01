const mongoose = require('mongoose');

const generatedMediaSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    dreamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream', index: true, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    mediaUrl: { type: String },
    errorMessage: { type: String },
    savedToGallery: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Compound index for efficient gallery querying
generatedMediaSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('GeneratedMedia', generatedMediaSchema);
