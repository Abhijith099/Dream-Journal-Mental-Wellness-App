const mongoose = require('mongoose');

const peerStorySchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String },
    isAnonymous: { type: Boolean, default: true },
    authorName: { type: String },
    overcame: { type: Boolean },
    overcomeDetail: { type: String },
    consentGiven: { type: Boolean, required: true, default: false },
    consentTimestamp: { type: Date },
    approved: { type: Boolean, default: false },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

module.exports = mongoose.model('PeerStory', peerStorySchema);
