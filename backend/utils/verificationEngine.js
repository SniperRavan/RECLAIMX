// backend/utils/verificationEngine.js
// Returns { score: 0-1, unverifiable: bool }
// unverifiable=true when reporter left all hidden fields blank — auto-pass.

exports.checkAnswers = function (answers, hiddenAttributes) {
  if (!answers || !hiddenAttributes) return { score: 0, unverifiable: false };

  const pairs = [
    [answers.q1, hiddenAttributes.colorInside],
    [answers.q2, hiddenAttributes.uniqueMarks],
    [answers.q3, hiddenAttributes.contains],
  ];

  let total = 0, matched = 0;

  for (const [answer, truth] of pairs) {
    if (!truth?.trim()) continue; // blank hidden field — skip
    total++;
    if (answer && wordSimilarity(answer.toLowerCase().trim(), truth.toLowerCase().trim()) >= 0.60) {
      matched++;
    }
  }

  if (total === 0) return { score: 1.0, unverifiable: true };
  return { score: matched / total, unverifiable: false };
};

// Jaccard on whitespace tokens — handles minor typos & word-order differences
function wordSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const setB = new Set(b.split(/\s+/).filter(w => w.length > 1));
  if (!setA.size || !setB.size) return 0;
  const intersection = [...setA].filter(w => setB.has(w));
  return intersection.length / Math.max(setA.size, setB.size);
}
