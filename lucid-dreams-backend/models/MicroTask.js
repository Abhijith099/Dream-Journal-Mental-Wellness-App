const mongoose = require('mongoose');

const microTaskSchema = new mongoose.Schema({
    taskText: { type: String, required: true },
    category: { type: String, enum: ['Health', 'Order', 'Connection', 'Self-Care'] }
});

module.exports = mongoose.model('MicroTask', microTaskSchema);
