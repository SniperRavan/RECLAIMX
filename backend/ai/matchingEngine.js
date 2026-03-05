// backend/ai/matchingEngine.js
// ──────────────────────────────────────────────────────────────
// Hybrid AI matching engine
// Weights: 40% text (TF-IDF) + 30% image + 20% location + 10% time
// Threshold: 55% minimum for a match
// ──────────────────────────────────────────────────────────────

const LostItem  = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim     = require('../models/Claim');

const MATCH_THRESHOLD = 55;

const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','at','to','for','of','and','or','but',
  'my','i','was','been','have','has','had','lost','found','item','thing','some'
]);

// ── Text scoring (TF-IDF simplified) ──────────────────────────
function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function computeTextScore(lost, found) {
  const lostTokens  = tokenize(`${lost.itemName} ${lost.description || ''}`);
  const foundTokens = tokenize(`${found.itemName} ${found.description || ''}`);

  if (!lostTokens.length || !foundTokens.length) return 0;

  const lostSet  = new Set(lostTokens);
  const foundSet = new Set(foundTokens);
  const intersection = [...lostSet].filter(w => foundSet.has(w));
  const union = new Set([...lostSet, ...foundSet]);

  return Math.round((intersection.length / union.size) * 100);
}

// ── Location scoring ───────────────────────────────────────────
function computeLocationScore(lost, found) {
  const lostLoc  = tokenize(lost.lastSeenLocation  || '');
  const foundLoc = tokenize(found.foundLocation || '');
  if (!lostLoc.length || !foundLoc.length) return 50; // neutral
  const lostSet = new Set(lostLoc);
  const overlap = foundLoc.filter(w => lostSet.has(w)).length;
  return Math.round((overlap / Math.max(lostLoc.length, foundLoc.length)) * 100);
}

// ── Time decay scoring ─────────────────────────────────────────
function computeTimeScore(lost, found) {
  const diffHours = Math.abs(new Date(lost.createdAt) - new Date(found.createdAt)) / 3600000;
  if (diffHours < 2)    return 100;
  if (diffHours < 6)    return 85;
  if (diffHours < 24)   return 70;
  if (diffHours < 72)   return 50;
  if (diffHours < 168)  return 30;
  return 10;
}

// ── Image scoring (placeholder — MobileNet in production) ──────
function computeImageScore(lost, found) {
  // Production: compare MobileNet embeddings stored on Cloudinary
  // For now return neutral 50 if both have images, 40 if not
  const hasImages = (lost.imageUrls?.length > 0) && found.imageUrl;
  return hasImages ? 65 : 40;
}

// ── Main matching function ─────────────────────────────────────
function computeMatch(lost, found) {
  // Must be same campus and same category
  if (lost.campusId !== found.campusId)   return { score: 0, isMatch: false };
  if (lost.category !== found.category)   return { score: 0, isMatch: false };

  const textScore     = computeTextScore(lost, found);
  const imageScore    = computeImageScore(lost, found);
  const locationScore = computeLocationScore(lost, found);
  const timeScore     = computeTimeScore(lost, found);

  // Weighted formula: 40% text + 30% image + 20% location + 10% time
  const finalScore = Math.round(
    textScore     * 0.40 +
    imageScore    * 0.30 +
    locationScore * 0.20 +
    timeScore     * 0.10
  );

  return {
    score: finalScore,
    isMatch: finalScore >= MATCH_THRESHOLD,
    breakdown: { textScore, imageScore, locationScore, timeScore }
  };
}

// ── Run matching after new item submitted ──────────────────────
async function runMatching(newLostItem, newFoundItem) {
  try {
    if (newLostItem) {
      // New lost report — check against all open found items
      const foundItems = await FoundItem.find({
        campusId: newLostItem.campusId,
        category: newLostItem.category,
        status:   'Found'
      });

      for (const found of foundItems) {
        const { score, isMatch } = computeMatch(newLostItem, found);
        if (isMatch) {
          await Claim.create({
            lostItemId:  newLostItem._id,
            foundItemId: found._id,
            claimantId:  newLostItem.userId,
            matchScore:  score,
          });
          console.log(`[Match] "${newLostItem.itemName}" ↔ "${found.itemName}" — ${score}%`);
        }
      }
    }

    if (newFoundItem) {
      // New found item — check against all open lost reports
      const lostItems = await LostItem.find({
        campusId: newFoundItem.campusId,
        category: newFoundItem.category,
        status:   'Lost'
      });

      for (const lost of lostItems) {
        const { score, isMatch } = computeMatch(lost, newFoundItem);
        if (isMatch) {
          await Claim.create({
            lostItemId:  lost._id,
            foundItemId: newFoundItem._id,
            claimantId:  lost.userId,
            matchScore:  score,
          });
          console.log(`[Match] "${lost.itemName}" ↔ "${newFoundItem.itemName}" — ${score}%`);
        }
      }
    }
  } catch (err) {
    console.error('[Matching Engine Error]', err.message);
  }
}

module.exports = { runMatching, computeMatch };
