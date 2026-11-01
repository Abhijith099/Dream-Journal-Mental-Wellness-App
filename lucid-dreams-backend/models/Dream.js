const mongoose = require('mongoose');

const dreamSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true }, // Keep for compatibility
    memoryText: { type: String },
    wordCount: { type: Number, default: 0 },
    isLucid: { type: Boolean, default: false }, // DEPRECATED — replaced by lucidAwareness

    // New Step 1 fields: The Event
    lucidAwareness: {
        type: String,
        enum: ['no', 'unsure', 'yes_briefly', 'yes_mostly'],
        default: 'no'
    },
    lucidResponse: {
        type: String,
        enum: [
            'observed', 'tried_to_wake', 'tried_to_escape',
            'changed_setting', 'changed_event', 'sought_help',
            'became_clearer', 'became_unstable', 'woke_up', null
        ],
        default: null
    },

    // New Step 2 fields: The Context
    preSleepStressors: [{ type: String }],
    dominantConcern: {
        type: String,
        enum: [
            'something_to_solve', 'a_regret', 'a_fear', 'a_memory',
            'lack_of_control', 'body_sensation', 'nothing', 'unsure', null
        ],
        default: null
    },
    concernIntensity: {
        type: Number,
        min: 0,
        max: 10,
        default: null
    },
    perceivedThreats: [{ type: String }],
    dreamNeed: [{ type: String }],
    lifeConnection: {
        type: String,
        enum: ['yes_know', 'maybe_unsure', 'no_connection', 'prefer_not', null],
        default: null
    },
    lifeConnectionArea: [{ type: String }],

    // New Step 3 fields: The Response
    wakingPhysicalState: [{ type: String }],
    wakingEmotionalState: [{ type: String }],
    behavioralImpact: {
        type: String,
        enum: [
            'avoiding_something', 'seeking_reassurance', 'ruminating',
            'took_grounding_action', 'more_withdrawn', 'changed_plans',
            'more_motivated', 'nothing', null
        ],
        default: null
    },
    dayImpact: {
        type: String,
        enum: ['none', 'slightly', 'moderately', 'significantly', null],
        default: null
    },

    somaticArchiveTag: {
        type: String,
        enum: [
            'DEEP_SOMATIC_REST', 'TENSION_DISCHARGE', 'SUBCONSCIOUS_ECHO',
            'LUCID_STATE', 'ANXIETY_SIGNAL', 'REST_ARCHIVE', 'MEMORY_LOG'
        ],
        default: 'MEMORY_LOG'
    },

    // Human-made reference insight signals & prompts
    lucidityScore: { type: Number, default: 0 },
    narrativeContinuity: { type: Number, default: 0 },
    emotionalTone: [{ type: String }],
    reflectionPrompt: { type: String, default: "" },

    energyLevel: { type: Number, min: 1, max: 10, default: 5 },
    tags: [{ type: String }],
    aiInsight: { type: String },
    themes: {
        anxiety: { type: Number, default: 0 },
        control: { type: Number, default: 0 },
        isolation: { type: Number, default: 0 },
        joy: { type: Number, default: 0 },
        grief: { type: Number, default: 0 }
    },
    symbols: [{ type: String }],
    image: { type: String },
    imageUrl: { type: String },
    mediaType: { type: String, enum: ['pending', 'image', 'video'], default: 'pending' },
    videoUrl: { type: String },
    isRecurring: { type: Boolean, default: false },
    sentimentLabel: { type: String, enum: ['Positive', 'Neutral', 'Distressing'], default: 'Neutral' },
    rescriptedEnding: { type: String },
    vocalCharacterization: { type: String, default: null },
    inputMethod: { type: String, enum: ['typed', 'voice'], default: 'typed' },
    typingDynamics: {
        wordsPerMinute: { type: Number },
        averageWPM: { type: Number },
        timeToFirstKeystrokeMs: { type: Number },
        longPauseCount: { type: Number },
        pauseCount: { type: Number },
        backspaceRatio: { type: Number },
        sessionDurationMs: { type: Number },
        sessionDurationSeconds: { type: Number },
        completed: { type: Boolean, default: true }
    },
    date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound indexes
dreamSchema.index({ userId: 1, createdAt: -1 });
dreamSchema.index({ userId: 1, preSleepStressors: 1 });
dreamSchema.index({ userId: 1, perceivedThreats: 1 });
dreamSchema.index({ userId: 1, wakingEmotionalState: 1 });
dreamSchema.index({ userId: 1, behavioralImpact: 1 });

module.exports = mongoose.model('Dream', dreamSchema);