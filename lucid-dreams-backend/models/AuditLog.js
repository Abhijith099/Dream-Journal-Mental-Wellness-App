const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  actorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  action: { 
    type: String, 
    required: true,
    trim: true
  }, // e.g. "VIEW", "CREATE", "UPDATE", "DELETE", "TOGGLE_CONTENT", "FLAG_CONTENT"
  resourceType: { 
    type: String, 
    required: true,
    trim: true
  }, // e.g. "dream", "insight", "wellness", "sanctuary", "voice", "photo", "music", "emergency_contact"
  resourceId: { 
    type: String,
    default: null
  },
  dataBefore: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  dataAfter: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  details: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  ipAddress: { 
    type: String, 
    default: null 
  },
  userAgent: { 
    type: String, 
    default: null 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Maintain backwards compatibility for legacy caregiverId queries
auditLogSchema.virtual('caregiverId').get(function() {
  return this.actorId;
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
