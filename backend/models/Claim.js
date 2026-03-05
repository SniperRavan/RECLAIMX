// backend/models/Claim.js
const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  lostItemId:  { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem' },
  foundItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem' },
  claimantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  matchScore:  { type: Number },
  answers:     { q1: String, q2: String, q3: String },
  verificationScore: Number,
  losterConfirmed:   { type: Boolean, default: false },
  founderConfirmed:  { type: Boolean, default: false },
  status: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'Verified', 'Rejected', 'Resolved']
  },
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
