const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  resetToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes TTL in MongoDB
  },
});

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
