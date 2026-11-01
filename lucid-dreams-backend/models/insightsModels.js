const mongoose = require('mongoose');

// 1. Observation Schema
const observationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: 'A pattern worth noticing' },
    description: { type: String, required: true },
    trigger: { type: String, default: 'high_evening_worry' },
    outcome: { type: String, default: 'low_morning_energy' },
    confidence: { type: Number, min: 0, max: 100, default: 82 },
    observedCount: { type: Number, default: 5 },
    totalRelevantEntries: { type: Number, default: 8 },
    dateRange: { type: String, default: 'Last 30 days' },
    correlationId: { type: String, default: () => `CORR-${Math.floor(100 + Math.random() * 900)}` },
    active: { type: Boolean, default: true },
    flaggedInaccurate: { type: Boolean, default: false },
    inaccurateFeedback: [{
        date: { type: Date, default: Date.now },
        comment: String
    }]
}, { timestamps: true });

observationSchema.index({ userId: 1, createdAt: -1 });

// 2. Experiment Schema
const experimentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    observationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Observation' },
    title: { type: String, required: true, default: '5-minute thought-closure sequence' },
    subtitle: { type: String, default: 'A 5-minute thought-closure sequence before bed may be worth testing for the next 3 nights to decouple autonomic arousal before rem cycles.' },
    durationDays: { type: Number, default: 3 },
    currentDay: { type: Number, default: 1 },
    protocol: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'skipped'],
        default: 'pending'
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    logs: [{
        night: Number,
        date: { type: Date, default: Date.now },
        completed: Boolean,
        notes: String
    }]
}, { timestamps: true });

experimentSchema.index({ userId: 1, status: 1 });

// 3. Intervention Schema
const interventionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    tags: [{ type: String }],
    categoryTag: { type: String, default: 'SOMATIC VAGAL PACING • 3-MINUTE PHYSICAL REGULATION' },
    lastUsed: { type: Date, default: Date.now },
    outcomes: [{
        outcome: { type: String, enum: ['helpful', 'neutral', 'unhelpful'], required: true },
        date: { type: Date, default: Date.now },
        notes: String,
        context: { type: String, default: 'Post-dream' }, // 'Morning', 'Pre-sleep', 'Post-dream', 'Midday stress'
        beforeState: { type: mongoose.Schema.Types.Mixed },
        afterState: { type: mongoose.Schema.Types.Mixed },
        somaticObservations: [{ type: String }]
    }],
    totalSessions: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 }
}, { timestamps: true });

interventionSchema.index({ userId: 1, name: 1 });

// 4. EveningCheckIn Schema
const eveningCheckInSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    worryScore: { type: Number, min: 0, max: 10, default: 5 },
    tensionLevel: { type: Number, min: 0, max: 10, default: 5 },
    factors: [{ type: String }], // 'Work pressure', 'Relationship worry', etc.
    notes: { type: String }
}, { timestamps: true });

eveningCheckInSchema.index({ userId: 1, date: 1 }, { unique: true });

// 5. MorningReflection Schema
const morningReflectionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    energyScore: { type: Number, min: 1, max: 10, default: 5 },
    restfulness: { type: Number, min: 1, max: 10, default: 5 },
    mood: { type: String },
    physicalState: [{ type: String }],
    emotionalState: [{ type: String }],
    notes: { type: String }
}, { timestamps: true });

morningReflectionSchema.index({ userId: 1, date: 1 }, { unique: true });

// 6. DreamEntry Schema (Reference to Dream collection with compatible projection)
// Re-uses the existing Dream schema or model
let DreamModel;
try {
    DreamModel = mongoose.model('Dream');
} catch (e) {
    DreamModel = require('./Dream');
}

// 7. ResetSession Schema
const resetSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    practice: {
        type: String,
        required: true,
        default: 'body_reset'
    },
    selectedState: {
        type: String,
        default: 'chest_rib_tension'
    },
    durationSeconds: { type: Number, default: 90 },
    completed: { type: Boolean, default: true },
    afterResponse: {
        type: String,
        enum: ['more_settled', 'same', 'more_activated', 'not_sure'],
        default: 'more_settled'
    },
    perceivedChange: [{ type: String }],
    notes: { type: String }
}, { timestamps: true });

resetSessionSchema.index({ userId: 1, completed: 1, createdAt: -1 });

const Observation = mongoose.models.Observation || mongoose.model('Observation', observationSchema);
const Experiment = mongoose.models.Experiment || mongoose.model('Experiment', experimentSchema);
const Intervention = mongoose.models.Intervention || mongoose.model('Intervention', interventionSchema);
const EveningCheckIn = mongoose.models.EveningCheckIn || mongoose.model('EveningCheckIn', eveningCheckInSchema);
const MorningReflection = mongoose.models.MorningReflection || mongoose.model('MorningReflection', morningReflectionSchema);
const ResetSession = mongoose.models.ResetSession || mongoose.model('ResetSession', resetSessionSchema);
const DreamEntry = DreamModel;

module.exports = {
    Observation,
    Experiment,
    Intervention,
    EveningCheckIn,
    MorningReflection,
    ResetSession,
    DreamEntry
};
