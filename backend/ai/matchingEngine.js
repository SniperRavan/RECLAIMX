// backend/ai/matchingEngine.js
// Heuristic scoring engine. Not ML — deterministic weighted signals.
// Weights: Text(40%) + Image(30%) + Location(20%) + Time(10%)
const supabase = require('../config/supabase');

const MATCH_THRESHOLD    = 40;
const MAX_TIME_GAP_HOURS = 72;
const IMAGE_BOTH_SCORE   = 65;
const IMAGE_ONE_SCORE    = 40;
const IMAGE_NONE_SCORE   = 20;

const STOP_WORDS = new Set([
  'the','a','an','is','it','in','on','at','of','and','or',
  'to','was','i','my','me','have','had','has','with','that','this','for','be',
]);

function tokenise(text) {
  if (!text || typeof text !== 'string') return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccard(a, b) {
  const setA = tokenise(a);
  const setB = tokenise(b);
  if (!setA.size && !setB.size) return 0;
  const intersection = [...setA].filter(w => setB.has(w));
  return Math.round((intersection.length / new Set([...setA, ...setB]).size) * 100);
}

function textScore(lost, found) {
  return Math.round((jaccard(lost.item_name, found.item_name) * 0.7) +
                    (jaccard(lost.description, found.description) * 0.3));
}

function imageScore(lost, found) {
  const lostHas  = lost.image_urls?.length > 0;
  const foundHas = found.image_url?.trim() !== '';
  if (lostHas && foundHas) return IMAGE_BOTH_SCORE;
  if (lostHas || foundHas) return IMAGE_ONE_SCORE;
  return IMAGE_NONE_SCORE;
}

function timeScore(lost, found) {
  const gapHours = Math.abs(
    new Date(lost.created_at).getTime() - new Date(found.created_at).getTime()
  ) / 3_600_000;
  if (gapHours >= MAX_TIME_GAP_HOURS) return 0;
  return Math.round((1 - gapHours / MAX_TIME_GAP_HOURS) * 100);
}

function calcFinalScore(lost, found) {
  const t = textScore(lost, found);
  const i = imageScore(lost, found);
  const l = jaccard(lost.last_seen_location, found.found_location);
  const tm = timeScore(lost, found);
  return {
    finalScore: Math.round((t * 0.40) + (i * 0.30) + (l * 0.20) + (tm * 0.10)),
    breakdown:  { textScore: t, imageScore: i, locationScore: l, timeScore: tm },
  };
}

async function runMatchingForItem(newItem, type) {
  try {
    const isLost         = type === 'lost';
    const oppositeTable  = isLost ? 'found_items' : 'lost_items';
    const oppositeStatus = isLost ? 'Found' : 'Lost';

    console.log(
      `[MatchEngine] Running for "${newItem.item_name}" (${type}) campus=${newItem.campus_id} category=${newItem.category}`
    );

    const { data: candidates, error } = await supabase
      .from(oppositeTable)
      .select('*')
      .eq('campus_id', newItem.campus_id)
      .eq('category',  newItem.category)
      .eq('status',    oppositeStatus);

    if (error) throw error;
    console.log(`[MatchEngine] Candidates found: ${candidates?.length ?? 0}`);

    if (!candidates?.length) return;

    const matches = candidates.reduce((acc, candidate) => {
      const lost  = isLost ? newItem : candidate;
      const found = isLost ? candidate : newItem;
      const { finalScore } = calcFinalScore(lost, found);

      console.log(`[MatchEngine] "${lost.item_name}" vs "${found.item_name}" → score ${finalScore}`);

      if (finalScore >= MATCH_THRESHOLD) {
        acc.push({
          lost_item_id:  lost.id,
          found_item_id: found.id,
          claimant_id:   lost.user_id,
          match_score:   finalScore,
          status:        'Pending',
        });
      }
      return acc;
    }, []);

    console.log(`[MatchEngine] Matches above threshold (${MATCH_THRESHOLD}): ${matches.length}`);
    if (!matches.length) return;

    const { error: claimError } = await supabase
      .from('claims')
      .upsert(matches, { onConflict: 'lost_item_id,found_item_id', ignoreDuplicates: true });

    if (claimError) throw claimError;
    console.log(`[MatchEngine] ${matches.length} claim(s) upserted for item ${newItem.id}`);
  } catch (err) {
    console.error('[MatchEngine] Error:', err.message);
  }
}

module.exports = { runMatchingForItem, calcFinalScore };
