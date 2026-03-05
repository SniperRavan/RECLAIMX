// backend/utils/sensitiveDataFilter.js
// Blocks Aadhaar, ATM cards, PAN, Voter ID, phone numbers

const PATTERNS = [
  /\b\d{12}\b/,                  // Aadhaar
  /\b\d{16}\b/,                  // ATM/card
  /\b[A-Z]{5}\d{4}[A-Z]\b/,     // PAN
  /\b[A-Z]{3}\d{7}\b/,          // Voter ID
  /\b[6-9]\d{9}\b/,             // Indian phone number
];

exports.hasSensitiveData = function(text) {
  if (!text) return false;
  return PATTERNS.some(p => p.test(text));
};
