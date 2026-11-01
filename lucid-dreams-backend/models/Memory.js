const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    title: { 
        type: String, 
        trim: true,
        default: ''
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    imageUrl: { 
        type: String, 
        default: ''
    },
    photoUrl: {
        type: String,
        default: ''
    },
    audioUrl: { 
        type: String, 
        default: ''
    }
}, {
    timestamps: true
});

memorySchema.pre('save', function() {
    if (!this.imageUrl && this.photoUrl) {
        this.imageUrl = this.photoUrl;
    }
    if (!this.photoUrl && this.imageUrl) {
        this.photoUrl = this.imageUrl;
    }
});

module.exports = mongoose.model('Memory', memorySchema);
