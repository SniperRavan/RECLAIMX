/**
 * matchingEngine.js
 * * ReclaimX Heuristic Scoring Engine (V2 - Refined)
 * -----------------------------------------------
 * This engine uses a weighted heuristic approach to match lost and found items.
 * * DESIGN PHILOSOPHY:
 * 1. Heuristic vs AI: We use deterministic weights rather than a "black box" model.
 * This ensures predictable behavior and clear explainability during the Viva.
 * 2. Multi-Signal Fusion: We combine Text, Image (Presence), Location, and Time.
 * 3. Scalability: We filter by campus and category at the DB level before scoring.
 */

const supabase = require('../config/supabase');

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const MATCH_THRESHOLD     = 40; // Minimum score to trigger a "match"
const MAX_TIME_GAP_HOURS  = 72; // Maximum window for the Time Decay signal

// Image Presence Scores (Placeholders for future Vector Embedding similarity)
const IMAGE_BOTH_SCORE    = 65; 
const IMAGE_ONE_SCORE     = 40; 
const IMAGE_NONE_SCORE    = 20;

// ── TEXT PROCESSING ─────────────────────────────────────────────────────────

const STOP_WORDS = new Set(['the','a','an','is','it','in','on','at','of','and','or','to','was','i','my','me','have','had','has','with','that','this','for','be']);

/**
 * Normalizes text and removes noise.
 * Filters out short words and common stop-words to improve signal-to-noise ratio.
 */
function tokenise(text) {
  if (!text || typeof text !== 'string') return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/**
 * Jaccard Similarity Calculation
 * Logic: (Size of Intersection) / (Size of Union) * 100
 */
function jaccardSimilarity(textA, textB) {
  const setA = tokenise(textA); 
  const setB = tokenise(textB);
  
  if (setA.size === 0 && setB.size === 0) return 0;
  
  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  
  return Math.round((intersection.size / union.size) * 100);
}

// ── SCORING SUB-FUNCTIONS ────────────────────────────────────────────────────

/**
 * Calculates text similarity with a 70/30 weight bias toward the Item Name.
 */
function calcTextScore(lostItem, foundItem) {
  const nameScore = jaccardSimilarity(lostItem.item_name, foundItem.item_name);
  const descScore = jaccardSimilarity(lostItem.description, foundItem.description);
  return Math.round((nameScore * 0.7) + (descScore * 0.3));
}

/**
 * PLACEHOLDER: Rewards the presence of visual data.
 * v3 Implementation: Integrate MobileNet/pgvector for actual pixel similarity.
 */
function calcImageScore(lostItem, foundItem) {
  const lostHasImage  = lostItem.image_urls && lostItem.image_urls.length > 0;
  const foundHasImage = foundItem.image_url && foundItem.image_url.trim() !== '';
  
  if (lostHasImage && foundHasImage) return IMAGE_BOTH_SCORE;
  if (lostHasImage || foundHasImage) return IMAGE_ONE_SCORE;
  return IMAGE_NONE_SCORE;
}

/**
 * Linear Time Decay: Score decreases as the time gap between reports increases.
 * 0 hours gap = 100 points | 72+ hours gap = 0 points.
 */
function calcTimeScore(lostItem, foundItem) {
  const lostTime  = new Date(lostItem.created_at).getTime();
  const foundTime = new Date(foundItem.created_at).getTime();
  const gapHours  = Math.abs(lostTime - foundTime) / (1000 * 60 * 60);
  
  if (gapHours >= MAX_TIME_GAP_HOURS) return 0;
  return Math.round((1 - gapHours / MAX_TIME_GAP_HOURS) * 100);
}

// ── CORE ENGINE LOGIC ────────────────────────────────────────────────────────

/**
 * Combines all signals into a final weighted confidence score.
 */
function calcFinalScore(lostItem, foundItem) {
  const textScore     = calcTextScore(lostItem, foundItem);
  const imageScore    = calcImageScore(lostItem, foundItem);
  const locationScore = jaccardSimilarity(lostItem.last_seen_location, foundItem.found_location);
  const timeScore     = calcTimeScore(lostItem, foundItem);

  // Weighted Sum Model:
  // Text(40%) + Image(30%) + Location(20%) + Time(10%) = 100%
  const finalScore = Math.round(
    (textScore * 0.40) + 
    (imageScore * 0.30) + 
    (locationScore * 0.20) + 
    (timeScore * 0.10)
  );

  return { finalScore, breakdown: { textScore, imageScore, locationScore, timeScore } };
}

/**
 * Main execution loop for the matching process.
 * Triggered on new item insertion.
 */
async function runMatchingForItem(newItem, type) {
  try {
    const isLost = type === 'lost';
    const oppositeTable = isLost ? 'found_items' : 'lost_items';
    const oppositeStatus = isLost ? 'Found' : 'Lost';

    // Query Optimization: Only fetch items on the same campus and in the same category
    const { data: candidates, error } = await supabase
      .from(oppositeTable)
      .select('*')
      .eq('campus_id', newItem.campus_id)
      .eq('category', newItem.category)
      .eq('status', oppositeStatus);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return;

    const matches = candidates.map(candidate => {
      const lostItem  = isLost ? newItem : candidate;
      const foundItem = isLost ? candidate : newItem;
      const { finalScore, breakdown } = calcFinalScore(lostItem, foundItem);

      if (finalScore >= MATCH_THRESHOLD) {
        return {
          lost_item_id:  lostItem.id,
          found_item_id: foundItem.id,
          claimant_id:   lostItem.user_id,
          match_score:   finalScore,
          status:        'Pending'
        };
      }
      return null;
    }).filter(m => m !== null);

    if (matches.length === 0) return;

    // Persist matches using upsert to prevent duplicate claim records
    const { error: claimError } = await supabase
      .from('claims')
      .upsert(matches, { onConflict: 'lost_item_id,found_item_id', ignoreDuplicates: true });

    if (claimError) throw claimError;
    console.log(`[MatchEngine] Processed ${matches.length} matches for item ${newItem.id}`);

  } catch (err) {
    console.error('[MatchEngine] Critical Execution Error:', err.message);
  }
}

module.exports = { runMatchingForItem, calcFinalScore };