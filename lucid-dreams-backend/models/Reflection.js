const mongoose = require('mongoose');

const reflectionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    order: { type: Number, required: true },
    category: { type: String, required: true, default: 'general' }
});

module.exports = mongoose.model('Reflection', reflectionSchema);
