const mongoose = require('mongoose');

const safetyPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    warningSigns: { type: [String], default: [] },
    copingStrategies: { type: [String], default: [] },
    distractions: { type: [String], default: [] },
    professionalSupport: { type: [String], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('SafetyPlan', safetyPlanSchema);
