const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },

    // 1. Somatic Continuum (1 = Very Unsettled, 5 = Deeply Grounded; null if opted-out)
    somaticScale: { 
        type: Number, 
        min: 1, 
        max: 5, 
        default: null 
    },
    somaticLabel: {
        type: String,
        enum: ['very_unsettled', 'unsettled', 'neutral', 'settled', 'deeply_grounded', 'unspecified'],
        default: 'unspecified'
    },

    // 2. Somatic Region Markers (Where the body holds the sensation)
    bodyRegions: [{
        type: String,
        enum: [
            'chest_tightness', 
            'jaw_clenching', 
            'restless_energy', 
            'heaviness', 
            'even_open'
        ]
    }],

    // 3. One-Tap Context Trigger
    contextTag: {
        type: String,
        enum: [
            'just_woke_up',
            'before_sleep',
            'after_dream',
            'difficult_interaction',
            'after_caffeine',
            'after_movement',
            'after_music',
            'no_trigger'
        ],
        required: true,
        default: 'no_trigger'
    },

    // 4. The Spotify Intercept Engine (Active Regulation Telemetry)
    spotifyImpact: {
        impact: {
            type: String,
            enum: ['settled', 'energized', 'mirrored', 'increased_tension', 'no_effect', null],
            default: null
        },
        trackName: { type: String, default: null },
        sessionMinutes: { type: Number, default: null }
    },

    // 5. Backwards-Compatibility Fields (Maintains existing insights algorithms)
    energyLevel: { 
        type: Number, 
        min: 1, 
        max: 10,
        default: 5
    },
    emotionTag: { 
        type: String, 
        default: 'neutral' 
    }
}, {
    timestamps: true
});

// Automatic Backwards-Compatibility Mapping:
// Ensures legacy metrics (insights averages, alerts) stay populated
moodLogSchema.pre('validate', function() {
    if (this.somaticScale !== undefined && this.somaticScale !== null) {
        // Map 1-5 somatic scale to 1-10 energy spectrum
        const scaleToEnergyMap = { 1: 2, 2: 4, 3: 5, 4: 7, 5: 9 };
        this.energyLevel = scaleToEnergyMap[this.somaticScale] || 5;

        // Map somatic label to legacy emotionTag
        const scaleToEmotionMap = {
            very_unsettled: 'overwhelmed',
            unsettled: 'tense',
            neutral: 'okay',
            settled: 'calm',
            deeply_grounded: 'calm'
        };
        this.emotionTag = scaleToEmotionMap[this.somaticLabel] || 'okay';
    } else if (!this.energyLevel) {
        this.energyLevel = 5;
        this.emotionTag = this.emotionTag || 'okay';
    }
});

// Compound indexes for user query sorting/range filtering and context correlation
moodLogSchema.index({ userId: 1, createdAt: -1 });
moodLogSchema.index({ userId: 1, contextTag: 1 });
moodLogSchema.index({ userId: 1, 'spotifyImpact.impact': 1 });

module.exports = mongoose.model('MoodLog', moodLogSchema);
