const mongoose = require('mongoose');

const caregiverAssignmentSchema = new mongoose.Schema({
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  relationship: {
    type: String,
    trim: true,
    default: 'Caregiver'
  },
  permissions: {
    canViewDreams: { type: Boolean, default: true },
    canViewWellness: { type: Boolean, default: true },
    canViewSanctuary: { type: Boolean, default: true },
    canManageContent: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

caregiverAssignmentSchema.index({ caregiverId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model('CaregiverAssignment', caregiverAssignmentSchema);
