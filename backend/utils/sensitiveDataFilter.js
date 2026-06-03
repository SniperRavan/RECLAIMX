// backend/utils/sensitiveDataFilter.js
// Warns users who accidentally submit sensitive identifiers.
// NOT a security guarantee — regex-based, bypassable with spaces/dots.
// Purpose: reduce accidental exposure, not prevent malicious actors.

const PATTERNS = [
  { pattern: /\b\d{12}\b/,              name: 'Aadhaar number' },
  { pattern: /\b\d{16}\b/,              name: 'card number' },
  { pattern: /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/, name: 'PAN card number' },
  { pattern: /\b[A-Za-z]{3}\d{7}\b/,   name: 'Voter ID' },
  { pattern: /\b[6-9]\d{9}\b/,          name: 'phone number' },
];

function normalise(text) {
  return (text || '').replace(/[\s\-]/g, '');
}

function checkForSensitiveData(fields) {
  const toCheck  = Array.isArray(fields) ? fields : [fields];
  const detected = [];

  for (const field of toCheck) {
    const raw  = field || '';
    const norm = normalise(raw);
    for (const { pattern, name } of PATTERNS) {
      if (!detected.includes(name) && (pattern.test(raw) || pattern.test(norm))) {
        detected.push(name);
      }
    }
  }

  return { hasSensitive: detected.length > 0, detectedTypes: detected };
}

function sensitiveDataMiddleware(req, res, next) {
  const { hasSensitive, detectedTypes } = checkForSensitiveData([
    req.body.description,
    req.body.hidden_contains,
    req.body.hidden_unique_marks,
    req.body.hidden_color_inside,
  ].filter(Boolean));

  if (hasSensitive) {
    return res.status(400).json({
      error:        'Submission blocked',
      message:      `Your submission appears to contain sensitive identifiers: ${detectedTypes.join(', ')}. Please remove them.`,
      detectedTypes,
    });
  }
  next();
}

module.exports = { checkForSensitiveData, sensitiveDataMiddleware };
