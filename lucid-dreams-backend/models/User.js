const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    auth0Id: { type: String, index: true, sparse: true },
    designation: { type: String, default: "NEURAL SUBJECT 01" },
    totalEntries: { type: Number, default: 0 },
    lastEntryDate: { type: Date },
    typingDynamicsEnabled: { type: Boolean, default: false },
    displayName: { type: String },
    firstName: { type: String },
    hasCompletedOnboarding: { type: Boolean, default: false },
    primaryIntent: { 
        type: String, 
        enum: ['dreams', 'anxiety', 'mood', 'wellness', 'caregiver', null], 
        default: null 
    },
    typicalWakeTime: { 
        type: String, 
        enum: ['early', 'morning', 'late', null], 
        default: null 
    },
    recentSleepQuality: { type: Number, min: 1, max: 5 },
    onboardingMoodWord: { type: String, trim: true },
    currentStateTag: { type: String },
    wantsMemorySupport: { type: Boolean, default: false },
    // Spotify fields:
    spotifyId: { type: String, unique: true, sparse: true },
    spotifyAccessToken: String,
    spotifyRefreshToken: String,
    spotifyTokenExpiry: Date,
    spotifyPlaylists: { type: Array, default: [] },
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
