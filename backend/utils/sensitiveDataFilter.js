/**
 * sensitiveDataFilter.js
 *
 * ⚠️  IMPORTANT — READ THIS BEFORE USING:
 * ─────────────────────────────────────────────────────────────────────────────
 * This filter is a UX helper that WARNS users when they accidentally type
 * sensitive info. It is NOT a security guarantee.
 *
 * Regex-based filters can be bypassed by:
 *   - Adding spaces:  "1234 5678 9012 3456"
 *   - Using dots:     "1234.5678.9012.3456"
 *   - Writing words:  "aadhaar is 1234..."
 *
 * Do NOT claim this "secures" the data. It reduces accidental exposure.
 * The README should say: "warns users against pasting sensitive identifiers"
 * rather than "blocks sensitive data".
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Detection Patterns ────────────────────────────────────────────────────────

// Matches 12 consecutive digits — covers standard Aadhaar format.
// We strip spaces/hyphens first before checking, so "1234 5678 9012" is also caught.
const AADHAAR_PATTERN  = /\b\d{12}\b/;

// Standard 16-digit card number (Visa, Mastercard, etc.)
const CARD_PATTERN     = /\b\d{16}\b/;

// PAN format: 5 letters, 4 digits, 1 letter. Case-insensitive.
const PAN_PATTERN      = /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/;

// Voter ID: roughly 3 letters + 7 digits (varies by state, so this is approximate)
const VOTER_ID_PATTERN = /\b[A-Za-z]{3}\d{7}\b/;

// 10-digit Indian mobile numbers (starting with 6-9)
const PHONE_PATTERN    = /\b[6-9]\d{9}\b/;

const ALL_PATTERNS = [
  { pattern: AADHAAR_PATTERN,  name: 'Aadhaar number' },
  { pattern: CARD_PATTERN,     name: 'card number'     },
  { pattern: PAN_PATTERN,      name: 'PAN card number' },
  { pattern: VOTER_ID_PATTERN, name: 'Voter ID'        },
  { pattern: PHONE_PATTERN,    name: 'phone number'    },
];

// ── Helper: normalise text before checking ────────────────────────────────────

/**
 * Remove spaces and hyphens so "1234 5678 9012 3456" is detected the same
 * as "1234567890123456". This improves recall significantly.
 */
function normalise(text) {
  return (text || '').replace(/[\s\-]/g, '');
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * checkForSensitiveData(fields)
 *
 * Checks one or more text fields for patterns that look like sensitive identifiers.
 *
 * @param {string|string[]} fields - Text field(s) to check
 * @returns {{ hasSensitive: boolean, detectedTypes: string[] }}
 *
 * Usage in a route:
 *   const { hasSensitive, detectedTypes } = checkForSensitiveData([
 *     req.body.description,
 *     req.body.hiddenContains,
 *   ]);
 *   if (hasSensitive) return res.status(400).json({ error: `Please remove: ${detectedTypes.join(', ')}` });
 */
function checkForSensitiveData(fields) {
  const toCheck = Array.isArray(fields) ? fields : [fields];
  const detected = [];

  for (const field of toCheck) {
    const raw        = field || '';
    const normalised = normalise(raw);

    for (const { pattern, name } of ALL_PATTERNS) {
      if (pattern.test(raw) || pattern.test(normalised)) {
        if (!detected.includes(name)) {
          detected.push(name);
        }
      }
    }
  }

  return {
    hasSensitive: detected.length > 0,
    detectedTypes: detected,
  };
}

/**
 * sensitiveDataMiddleware
 *
 * Express middleware version — plug into any POST route to auto-block
 * submissions that contain sensitive data.
 *
 * Usage:
 *   router.post('/lost', authMiddleware, sensitiveDataMiddleware, handler);
 */
function sensitiveDataMiddleware(req, res, next) {
  const fieldsToCheck = [
    req.body.description,
    req.body.hidden_contains,
    req.body.hidden_unique_marks,
    req.body.hidden_color_inside,
  ].filter(Boolean); // ignore undefined fields

  const { hasSensitive, detectedTypes } = checkForSensitiveData(fieldsToCheck);

  if (hasSensitive) {
    return res.status(400).json({
      error: 'Submission blocked',
      message: `Your submission appears to contain sensitive identifiers: ${detectedTypes.join(', ')}. Please remove them for your own safety.`,
      // Being explicit helps the user understand what to fix
      detectedTypes,
    });
  }

  next();
}

module.exports = { checkForSensitiveData, sensitiveDataMiddleware };