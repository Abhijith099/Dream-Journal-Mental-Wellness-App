const mongoose = require('mongoose');

const sanctuaryContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true }, // e.g. "Daughter (Primary Caregiver)", "Son", "Care Companion"
  relationshipTag: { type: String, default: null }, // e.g. "Recent", "Daughter", "24/7"
  roleLabel: { type: String, default: 'Family Emergency Contact' },
  photoUrl: { type: String, default: '' },
  phoneNumber: { type: String, required: true }, // E.164 phone string
  maskedPhone: { type: String, default: '' },
  isEmergencyContact: { type: Boolean, default: false },
  isPrimary: { type: Boolean, default: false },
  isSample: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  directCallEnabled: { type: Boolean, default: true },
  availability: { type: String, default: 'Available 24/7' },
  sortOrder: { type: Number, default: 0 },
  reassuranceNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SanctuaryContact', sanctuaryContactSchema);
