const mongoose = require('mongoose');

const reassuranceSettingsSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true, 
        index: true 
    },
    homePhrase: { 
        type: String, 
        default: '',
        trim: true
    },
    locationPhrase: {
        type: String,
        default: '',
        trim: true
    },
    customReassuranceLine: { 
        type: String, 
        default: '',
        trim: true
    },
    reassuranceNote: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true
});

reassuranceSettingsSchema.pre('save', function() {
    if (!this.homePhrase && this.locationPhrase) {
        this.homePhrase = this.locationPhrase;
    }
    if (!this.locationPhrase && this.homePhrase) {
        this.locationPhrase = this.homePhrase;
    }
    if (!this.customReassuranceLine && this.reassuranceNote) {
        this.customReassuranceLine = this.reassuranceNote;
    }
    if (!this.reassuranceNote && this.customReassuranceLine) {
        this.reassuranceNote = this.customReassuranceLine;
    }
});

module.exports = mongoose.model('ReassuranceSettings', reassuranceSettingsSchema);
