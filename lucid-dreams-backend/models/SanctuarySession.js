const mongoose = require('mongoose');

const sanctuarySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  activities: [{
    activityType: {
      type: String,
      required: true
    },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'SanctuaryContact' },
    contactName: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  }],
  checkInFeeling: {
    type: String,
    enum: ['calmer', 'same', 'more_upset', 'not_sure'],
    default: null
  },
  callInitiated: {
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'SanctuaryContact' },
    contactName: { type: String, default: '' },
    sourceScreen: { type: String, default: 'Screen4_DialGuard' },
    timestamp: { type: Date }
  }
});

module.exports = mongoose.model('SanctuarySession', sanctuarySessionSchema);
