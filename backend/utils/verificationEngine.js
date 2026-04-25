// backend/utils/verificationEngine.js
//
// ERR-008 FIX:
// Original returned a plain number (0–1).
// The fixed matchRoutes.js expects an object: { score, unverifiable }.
// Changed return type to object throughout.
//
// ERR-021 FIX:
// Raised word-similarity threshold from 0.45 to 0.60.
// 0.45 was too easy to beat with social engineering (guessing common colors/marks).
// 0.60 requires more specific overlap between the answer and the hidden truth.

exports.checkAnswers = function(answers, hiddenAttributes) {
  if (!answers || !hiddenAttributes) {
    return { score: 0, unverifiable: false };
  }

  const pairs = [
    [answers.q1, hiddenAttributes.colorInside],
    [answers.q2, hiddenAttributes.uniqueMarks],
    [answers.q3, hiddenAttributes.contains],
  ];

  let total   = 0;
  let matched = 0;

  for (const [answer, truth] of pairs) {
    // Skip blank hidden fields — reporter didn't fill them in
    if (!truth || truth.trim() === '') continue;
    total++;

    if (answer && wordSimilarity(
      answer.toLowerCase().trim(),
      truth.toLowerCase().trim()
    ) >= 0.60) {  // ERR-021 FIX: was 0.45
      matched++;
    }
  }

  // If reporter left ALL hidden fields blank, there is nothing to verify against.
  // Return unverifiable=true so matchRoutes can auto-pass or flag for manual review,
  // rather than auto-failing a legitimate claim.
  if (total === 0) {
    return { score: 1.0, unverifiable: true };
  }

  return {
    score: matched / total,
    unverifiable: false,
  };
};

// Word-overlap (Jaccard) similarity — tokenised on whitespace.
// Handles minor typos and word-order differences better than exact string match.
// Examples:
//   "red lining" vs "red lining inside"  → 0.67 (passes)
//   "blue"        vs "red lining"         → 0.00 (fails)
//   "scratch on bottom" vs "has a scratch at bottom right" → 0.40 (fails — too vague)
function wordSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const setB = new Set(b.split(/\s+/).filter(w => w.length > 1));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(w => setB.has(w));
  return intersection.length / Math.max(setA.size, setB.size);
}