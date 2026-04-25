// backend/routes/matchRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const supabase = require('../config/supabase');
const { checkAnswers } = require('../utils/verificationEngine');

// GET /api/matches — fetch all matches relevant to the current user
//
// ERR-003 FIX:
// Original: .eq('claimant_id', user.id)
// Problem: claimant_id is always set to the LOSER's user ID (the person who lost the item).
// This means anyone who reported a FOUND item could never see matches for it.
// Their matches.html was permanently empty. The entire founder side of the flow was broken.
// Fix: fetch claims from BOTH sides — where user is the loser AND where user is the finder.
router.get('/', protect, async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users').select('*').eq('firebase_uid', req.user.uid).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Side 1: claims where this user is the loser (claimant)
    const { data: lostSide } = await supabase
      .from('claims')
      .select('*, lost_items(*), found_items(*)')
      .eq('claimant_id', user.id)
      .order('created_at', { ascending: false });

    // Side 2: claims where this user is the finder
    // Find all found_items this user submitted, then find claims for those items
    const { data: myFoundItems } = await supabase
      .from('found_items').select('id').eq('user_id', user.id);

    let foundSide = [];
    if (myFoundItems && myFoundItems.length > 0) {
      const foundItemIds = myFoundItems.map(f => f.id);
      const { data: fc } = await supabase
        .from('claims')
        .select('*, lost_items(*), found_items(*)')
        .in('found_item_id', foundItemIds)
        .order('created_at', { ascending: false });
      foundSide = fc || [];
    }

    // Merge and deduplicate by claim ID
    const allClaims = [...(lostSide || []), ...foundSide];
    const seen      = new Set();
    const unique    = allClaims.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    res.json(unique);
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/verify — submit ownership verification answers
router.post('/verify', protect, async (req, res, next) => {
  try {
    const { claimId, answers } = req.body;
    if (!claimId || !answers) {
      return res.status(400).json({ error: 'claimId and answers are required.' });
    }

    const { data: claim } = await supabase
      .from('claims').select('*, lost_items(*)').eq('id', claimId).single();
    const { data: user } = await supabase
      .from('users').select('*').eq('firebase_uid', req.user.uid).single();

    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    if (!user)  return res.status(404).json({ error: 'User not found.' });
    if (user.is_suspended) return res.status(403).json({ error: 'Account suspended.' });

    const hiddenAttributes = {
      colorInside: claim.lost_items?.hidden_color_inside || '',
      uniqueMarks: claim.lost_items?.hidden_unique_marks || '',
      contains:    claim.lost_items?.hidden_contains     || '',
    };

    // ERR-008: checkAnswers now returns { score, unverifiable } — not a plain number
    const result = checkAnswers(answers, hiddenAttributes);

    // If reporter left all hidden fields blank, nothing to verify against — auto-pass
    if (result.unverifiable) {
      await supabase.from('claims').update({
        status: 'Verified', verification_score: 1.0,
        answer_1: answers.q1, answer_2: answers.q2, answer_3: answers.q3
      }).eq('id', claimId);
      await supabase.from('lost_items').update({ status: 'Pending' })
        .eq('id', claim.lost_item_id);
      return res.json({ success: true, passed: true, score: 1.0, unverifiable: true });
    }

    if (result.score >= 0.6) {
      // Verification passed
      await supabase.from('claims').update({
        status: 'Verified',
        verification_score: result.score,
        answer_1: answers.q1, answer_2: answers.q2, answer_3: answers.q3
      }).eq('id', claimId);
      await supabase.from('lost_items').update({ status: 'Pending' })
        .eq('id', claim.lost_item_id);
      return res.json({ success: true, passed: true, score: result.score });

    } else {
      // Verification failed — increment strike counter
      const newFailed = (user.failed_claims || 0) + 1;
      const suspended = newFailed >= 3;

      await supabase.from('users')
        .update({ failed_claims: newFailed, is_suspended: suspended })
        .eq('id', user.id);
      await supabase.from('claims')
        .update({ status: 'Rejected', verification_score: result.score })
        .eq('id', claimId);

      return res.json({
        success: false, passed: false,
        score: result.score,
        attemptsUsed: newFailed,
        suspended,
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/confirm-handover/:claimId
//
// ERR-011 FIX:
// Original: only the person making the request got +10 trust points.
// Problem: The founder who found and returned the item got nothing, even though
// the README explicitly says both parties benefit from successful returns.
// Fix: After resolving, find the other party and update their score too.
router.post('/confirm-handover/:claimId', protect, async (req, res, next) => {
  try {
    const { data: claim } = await supabase
      .from('claims').select('*').eq('id', req.params.claimId).single();
    const { data: user } = await supabase
      .from('users').select('*').eq('firebase_uid', req.user.uid).single();

    if (!claim || !user) return res.status(404).json({ error: 'Not found.' });

    // Determine if current user is the loser or the finder
    const isLoser  = claim.claimant_id === user.id;
    const update   = isLoser
      ? { loster_confirmed: true }
      : { founder_confirmed: true };

    const { data: updated } = await supabase
      .from('claims').update(update).eq('id', claim.id).select().single();

    // Check if BOTH parties have now confirmed
    if (updated.loster_confirmed && updated.founder_confirmed) {

      // Mark everything resolved
      await Promise.all([
        supabase.from('claims').update({ status: 'Resolved' }).eq('id', claim.id),
        supabase.from('lost_items').update({ status: 'Resolved' }).eq('id', claim.lost_item_id),
        supabase.from('found_items').update({ status: 'Resolved' }).eq('id', claim.found_item_id),
      ]);

      // Give current user their trust points
      const newScore = (user.trust_score || 0) + 10;
      const newLevel = newScore >= 100 ? 'Gold' : newScore >= 50 ? 'Silver' : 'Bronze';
      await supabase.from('users')
        .update({ trust_score: newScore, trust_level: newLevel })
        .eq('id', user.id);

      // FIX ERR-011: Give the OTHER party +10 points too
      // Figure out who the other user is
      const { data: foundItem } = await supabase
        .from('found_items').select('user_id').eq('id', claim.found_item_id).single();

      const otherUserId = isLoser
        ? foundItem?.user_id      // current user is loser → other is founder
        : claim.claimant_id;      // current user is founder → other is loser

      if (otherUserId && otherUserId !== user.id) {
        const { data: otherUser } = await supabase
          .from('users').select('*').eq('id', otherUserId).single();
        if (otherUser) {
          const otherScore = (otherUser.trust_score || 0) + 10;
          const otherLevel = otherScore >= 100 ? 'Gold' : otherScore >= 50 ? 'Silver' : 'Bronze';
          await supabase.from('users')
            .update({ trust_score: otherScore, trust_level: otherLevel })
            .eq('id', otherUserId);
        }
      }

      return res.json({ success: true, bothConfirmed: true });
    }

    // Only one party confirmed so far
    res.json({ success: true, bothConfirmed: false });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/dismiss/:claimId — remove a match
//
// ERR-020 FIX:
// Original: deleted the claim with no ownership check whatsoever.
// Any authenticated user who knew a claim's UUID could delete someone else's match.
// UUIDs are exposed in the frontend HTML (in onclick attributes on match cards).
// Fix: verify the claim belongs to the current user before deleting.
router.post('/dismiss/:claimId', protect, async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users').select('id').eq('firebase_uid', req.user.uid).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Check ownership BEFORE deleting
    const { data: claim } = await supabase
      .from('claims').select('claimant_id').eq('id', req.params.claimId).single();

    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    if (claim.claimant_id !== user.id) {
      return res.status(403).json({ error: 'You can only dismiss your own claims.' });
    }

    await supabase.from('claims').delete().eq('id', req.params.claimId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;