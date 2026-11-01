const mongoose = require('mongoose');

const copingCardSchema = new mongoose.Schema({
    category: { type: String, required: true }, // e.g. 'work_pressure', 'anxiety', 'overwhelm'
    negativePattern: { type: String, required: true },
    gentleReframing: { type: String, required: true },
    actionStep: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('CopingCard', copingCardSchema);
