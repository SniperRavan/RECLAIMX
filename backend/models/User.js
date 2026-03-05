// ================================================================
// backend/models/User.js
// ================================================================
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid:  { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  campusId:     { type: String, default: 'campus_a' },
  trustScore:   { type: Number, default: 0 },
  trustLevel:   { type: String, default: 'Bronze', enum: ['Bronze','Silver','Gold'] },
  failedClaims: { type: Number, default: 0 },
  isSuspended:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
