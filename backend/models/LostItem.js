// backend/models/LostItem.js
const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campusId:     { type: String, required: true },
  itemName:     { type: String, required: true },          // public
  description:  { type: String },                          // private
  hiddenAttributes: {
    colorInside:  String,   // for verification questions
    uniqueMarks:  String,
    contains:     String,
  },
  category:         { type: String, required: true },
  lastSeenLocation: { type: String, required: true },
  imageUrls:        [String],
  status: {
    type: String,
    default: 'Lost',
    enum: ['Lost', 'Matched', 'Pending', 'Resolved']
  },
}, { timestamps: true });

module.exports = mongoose.model('LostItem', lostItemSchema);
