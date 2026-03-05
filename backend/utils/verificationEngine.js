// backend/utils/verificationEngine.js
// Compares claimant's answers to hidden item attributes
// Returns a score 0–1 (>= 0.6 = pass)

exports.checkAnswers = function(answers, hiddenAttributes) {
  if (!answers || !hiddenAttributes) return 0;

  const pairs = [
    [answers.q1, hiddenAttributes.colorInside],
    [answers.q2, hiddenAttributes.uniqueMarks],
    [answers.q3, hiddenAttributes.contains],
  ];

  let total = 0, matched = 0;
  pairs.forEach(([answer, truth]) => {
    if (!truth) return; // skip if not set by reporter
    total++;
    if (answer && wordSimilarity(answer.toLowerCase(), truth.toLowerCase()) >= 0.45) {
      matched++;
    }
  });

  return total === 0 ? 0 : matched / total;
};

// Simple word-overlap similarity (handles typos better than exact match)
function wordSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const setB = new Set(b.split(/\s+/).filter(w => w.length > 1));
  if (!setA.size || !setB.size) return 0;
  const intersection = [...setA].filter(w => setB.has(w));
  return intersection.length / Math.max(setA.size, setB.size);
}
