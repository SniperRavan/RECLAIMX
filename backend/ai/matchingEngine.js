/**
 * matchingEngine.js
 *
 * ReclaimX Heuristic Scoring Engine
 * ----------------------------------
 * This is NOT a machine-learning model. It's a weighted heuristic scoring
 * system that combines four signals into a single confidence score.
 *
 * Why "heuristic" and not "AI"?
 * Because being honest about what the code actually does is important —
 * both for your viva and for anyone who reads this later.
 *
 * Formula:
 *   finalScore = (textScore × 0.40) + (imageScore × 0.30) + (locationScore × 0.20) + (timeScore × 0.10)
 *
 * A match is created only when:
 *   - finalScore >= MATCH_THRESHOLD (55)
 *   - Same campus
 *   - Same category
 *
 * Future improvement: Replace imageScore with real MobileNet/pgvector embeddings.
 */

const supabase = require('../config/supabase');

// ── Constants ─────────────────────────────────────────────────────────────────

const MATCH_THRESHOLD = 55;           // Score must be at least this to trigger a match
const MAX_TIME_GAP_HOURS = 72;        // Items more than 72h apart get 0 time score
const IMAGE_BOTH_SCORE   = 65;        // Placeholder: both items have images uploaded
const IMAGE_ONE_SCORE    = 40;        // Placeholder: only one item has an image
const IMAGE_NONE_SCORE   = 20;        // Placeholder: neither item has images

// ── Text Similarity (Jaccard) ─────────────────────────────────────────────────

/**
 * Tokenises a string into a set of lowercase words,
 * filtering out short words and common stop-words that
 * add noise without helping matching (e.g. "the", "a", "is").
 */
const STOP_WORDS = new Set([
  'the','a','an','is','it','in','on','at','of','and','or','to','was',
  'i','my','me','have','had','has','with','that','this','for','be',
]);

function tokenise(text) {
  if (!text || typeof text !== 'string') return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')  // strip punctuation
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/**
 * Jaccard similarity: |intersection| / |union|
 * Returns 0–100.
 *
 * "wallet black leather" vs "black leather wallet" → 100
 * "wallet"              vs "phone"                 →   0
 * "blue wallet"         vs "black wallet"          →  33
 */
function jaccardSimilarity(textA, textB) {
  const setA = tokenise(textA);
  const setB = tokenise(textB);

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);

  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Combined text score: average of item-name similarity and description similarity.
 * Item name is the stronger signal so we weight it more.
 */
function calcTextScore(lostItem, foundItem) {
  const nameScore = jaccardSimilarity(lostItem.item_name, foundItem.item_name);
  const descScore = jaccardSimilarity(lostItem.description, foundItem.description);

  // Name matters more — a 70/30 split feels right for campus items
  return Math.round((nameScore * 0.7) + (descScore * 0.3));
}

// ── Image Score (placeholder — honest about it) ───────────────────────────────

/**
 * PLACEHOLDER: Right now this just rewards "having uploaded an image"
 * rather than actually comparing image content.
 *
 * TODO (v2): Replace with MobileNet embedding cosine similarity.
 * Either via TensorFlow.js server-side or via pgvector in Supabase.
 * See: https://supabase.com/docs/guides/ai/vector-columns
 */
function calcImageScore(lostItem, foundItem) {
  const lostHasImage  = lostItem.image_urls  && lostItem.image_urls.length > 0;
  const foundHasImage = foundItem.image_url  && foundItem.image_url.trim() !== '';

  if (lostHasImage && foundHasImage) return IMAGE_BOTH_SCORE;
  if (lostHasImage || foundHasImage) return IMAGE_ONE_SCORE;
  return IMAGE_NONE_SCORE;
}

// ── Location Score ────────────────────────────────────────────────────────────

/**
 * Token overlap between location strings.
 * "Library Ground Floor" vs "Library" → 33 (1 shared / 3 total unique)
 * "Canteen" vs "Library"              →  0
 *
 * Simple, but works well for campus locations where people type specific
 * building/floor names.
 */
function calcLocationScore(lostItem, foundItem) {
  return jaccardSimilarity(lostItem.last_seen_location, foundItem.found_location);
}

// ── Time Score ────────────────────────────────────────────────────────────────

/**
 * Decays from 100 → 0 based on how far apart the reports are in time.
 * Items reported within the same hour score 100.
 * Items more than MAX_TIME_GAP_HOURS apart score 0.
 *
 * Linear decay: score = 100 × (1 - (gap / MAX_TIME_GAP_HOURS))
 */
function calcTimeScore(lostItem, foundItem) {
  const lostTime  = new Date(lostItem.created_at).getTime();
  const foundTime = new Date(foundItem.created_at).getTime();
  const gapHours  = Math.abs(lostTime - foundTime) / (1000 * 60 * 60);

  if (gapHours >= MAX_TIME_GAP_HOURS) return 0;

  return Math.round((1 - gapHours / MAX_TIME_GAP_HOURS) * 100);
}

// ── Final Weighted Score ──────────────────────────────────────────────────────

/**
 * Combines all four signals into a single 0–100 confidence score.
 * Returns the score AND a breakdown so you can debug/log individual signals.
 */
function calcFinalScore(lostItem, foundItem) {
  const textScore     = calcTextScore(lostItem, foundItem);
  const imageScore    = calcImageScore(lostItem, foundItem);
  const locationScore = calcLocationScore(lostItem, foundItem);
  const timeScore     = calcTimeScore(lostItem, foundItem);

  const finalScore = Math.round(
    (textScore     * 0.40) +
    (imageScore    * 0.30) +
    (locationScore * 0.20) +
    (timeScore     * 0.10)
  );

  return {
    finalScore,
    breakdown: { textScore, imageScore, locationScore, timeScore },
  };
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * runMatchingForItem(newItem, type)
 *
 * Called whenever a new lost OR found item is submitted.
 * Scans all open items of the opposite type on the same campus/category
 * and creates claim records for any pair that exceeds MATCH_THRESHOLD.
 *
 * @param {Object} newItem - The newly submitted item (from Supabase insert)
 * @param {'lost'|'found'} type - Whether the new item is lost or found
 */
async function runMatchingForItem(newItem, type) {
  try {
    const oppositeTable = type === 'lost' ? 'found_items' : 'lost_items';
    const oppositeStatus = type === 'lost' ? 'Found' : 'Lost';

    // Step 1: Fetch candidate items — same campus, same category, still open
    // We filter early in the DB query so we don't pull unnecessary rows
    const { data: candidates, error } = await supabase
      .from(oppositeTable)
      .select('*')
      .eq('campus_id',  newItem.campus_id)
      .eq('category',   newItem.category)
      .eq('status',     oppositeStatus);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return;

    // Step 2: Score each candidate and collect matches above threshold
    const matches = [];

    for (const candidate of candidates) {
      const lostItem  = type === 'lost' ? newItem : candidate;
      const foundItem = type === 'lost' ? candidate : newItem;

      const { finalScore, breakdown } = calcFinalScore(lostItem, foundItem);

      console.log(`[MatchEngine] Lost "${lostItem.item_name}" ↔ Found "${foundItem.item_name}" → ${finalScore} | ${JSON.stringify(breakdown)}`);

      if (finalScore >= MATCH_THRESHOLD) {
        matches.push({
          lost_item_id:  lostItem.id,
          found_item_id: foundItem.id,
          // The claimant is the person who lost the item — they initiate the claim
          claimant_id:   lostItem.user_id,
          match_score:   finalScore,
          status:        'Pending',
        });
      }
    }

    if (matches.length === 0) return;

    // Step 3: Insert match records into claims table
    // upsert with onConflict ensures we don't create duplicate claims for the same pair
    const { error: claimError } = await supabase
      .from('claims')
      .upsert(matches, {
        onConflict: 'lost_item_id,found_item_id',
        ignoreDuplicates: true,
      });

    if (claimError) throw claimError;

    console.log(`[MatchEngine] Created ${matches.length} match(es) for item: ${newItem.id}`);

  } catch (err) {
    // Log the error but DON'T let it crash the main server process
    // A failed match run is annoying but not fatal — item was still saved
    console.error('[MatchEngine] Error during matching run:', err.message);
  }
}

module.exports = { runMatchingForItem, calcFinalScore };