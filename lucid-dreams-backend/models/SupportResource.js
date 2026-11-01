const mongoose = require('mongoose');

const supportResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    contactMethod: { type: String, required: true },
    region: { type: String, default: "Global" }
});

module.exports = mongoose.model('SupportResource', supportResourceSchema);
