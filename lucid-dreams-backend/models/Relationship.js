const mongoose = require('mongoose');

const relationshipSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    relation: { 
        type: String, 
        default: '',
        trim: true
    },
    relationship: {
        type: String,
        default: '',
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    pronoun: {
        type: String,
        enum: ['She', 'He', 'They'],
        default: 'They'
    },
    photoUrl: { 
        type: String, 
        default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' 
    }
}, {
    timestamps: true
});

relationshipSchema.pre('save', function() {
    if (!this.relation && this.relationship) {
        this.relation = this.relationship;
    }
    if (!this.relationship && this.relation) {
        this.relationship = this.relation;
    }
});

module.exports = mongoose.model('Relationship', relationshipSchema);
