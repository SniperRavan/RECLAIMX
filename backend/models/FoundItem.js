// backend/models/FoundItem.js
const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campusId:      { type: String, required: true },
  itemName:      { type: String, required: true },
  description:   { type: String },
  category:      { type: String, required: true },
  foundLocation: { type: String, required: true },
  imageUrl:      { type: String },
  status: {
    type: String,
    default: 'Found',
    enum: ['Found', 'Matched', 'Resolved']
  },
}, { timestamps: true });

module.exports = mongoose.model('FoundItem', foundItemSchema);
