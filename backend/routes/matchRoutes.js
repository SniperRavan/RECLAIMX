// backend/routes/matchRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const supabase = require('../config/supabase');
const { checkAnswers } = require('../utils/verificationEngine');

// GET /api/matches — both loser-side and founder-side claims
router.get('/', protect, async (req, res, next) => {
  try {
    const user = req.dbUser;

    // Side 1: user is the loser (claimant_id = user.id)
    const { data: lostSide } = await supabase
      .from('claims')
      .select('*, lost_items(*), found_items(*)')
      .eq('claimant_id', user.id)
      .order('created_at', { ascending: false });

    // Side 2: user is the finder (found_items.user_id = user.id)
    const { data: myFoundItems } = await supabase
      .from('found_items').select('id').eq('user_id', user.id);

    let foundSide = [];
    if (myFoundItems?.length) {
      const ids = myFoundItems.map(f => f.id);
      const { data: fc } = await supabase
        .from('claims')
        .select('*, lost_items(*), found_items(*)')
        .in('found_item_id', ids)
        .order('created_at', { ascending: false });
      foundSide = fc || [];
    }

    // Merge + deduplicate by claim id
    const seen   = new Set();
    const unique = [...(lostSide || []), ...foundSide].filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // Fetch all unique user IDs involved to get their emails
    const userIds = new Set();
    unique.forEach(c => {
      if (c.claimant_id) userIds.add(c.claimant_id);
      if (c.found_items && c.found_items.user_id) {
        userIds.add(c.found_items.user_id);
      }
    });

    const userMap = {};
    if (userIds.size > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email')
        .in('id', Array.from(userIds));
      if (usersData) {
        usersData.forEach(u => {
          userMap[u.id] = u.email;
        });
      }
    }

    const processedClaims = await Promise.all(unique.map(async (c) => {
      const claimCopy = { ...c };

      // If verified but no OTP exists (e.g. legacy claims), generate & save one on the fly
      if (claimCopy.status === 'Verified' && !claimCopy.handover_otp) {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await supabase
          .from('claims')
          .update({ handover_otp: generatedOtp })
          .eq('id', claimCopy.id);
        claimCopy.handover_otp = generatedOtp;
      }

      // 1. Reveal opposing party's email if status is Verified or Resolved
      if (claimCopy.status === 'Verified' || claimCopy.status === 'Resolved') {
        const isClaimant = claimCopy.claimant_id === user.id;
        const opposingUserId = isClaimant ? claimCopy.found_items?.user_id : claimCopy.claimant_id;
        if (opposingUserId && userMap[opposingUserId]) {
          claimCopy.opposing_email = userMap[opposingUserId];
        }
      }

      // 2. Hide handover_otp if current user is not the owner (claimant)
      if (claimCopy.claimant_id !== user.id) {
        delete claimCopy.handover_otp;
      }

      return claimCopy;
    }));

    res.json(processedClaims);
  } catch (err) { next(err); }
});

// POST /api/matches/verify — ownership verification answers
router.post('/verify', protect, async (req, res, next) => {
  try {
    const { claimId, answers } = req.body;
    if (!claimId || !answers) {
      return res.status(400).json({ error: 'claimId and answers are required.' });
    }

    const { data: claim } = await supabase
      .from('claims').select('*, lost_items(*)').eq('id', claimId).single();
    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    const user = req.dbUser;

    const hidden = {
      colorInside: claim.lost_items?.hidden_color_inside || '',
      uniqueMarks: claim.lost_items?.hidden_unique_marks || '',
      contains:    claim.lost_items?.hidden_contains     || '',
    };

    const result = checkAnswers(answers, hidden);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (result.unverifiable) {
      await supabase.from('claims').update({
        status: 'Verified', verification_score: 1.0,
        answer_1: answers.q1, answer_2: answers.q2, answer_3: answers.q3,
        handover_otp: otp
      }).eq('id', claimId);
      await supabase.from('lost_items').update({ status: 'Pending' }).eq('id', claim.lost_item_id);
      return res.json({ success: true, passed: true, score: 1.0, unverifiable: true });
    }

    if (result.score >= 0.6) {
      await supabase.from('claims').update({
        status: 'Verified', verification_score: result.score,
        answer_1: answers.q1, answer_2: answers.q2, answer_3: answers.q3,
        handover_otp: otp
      }).eq('id', claimId);
      await supabase.from('lost_items').update({ status: 'Pending' }).eq('id', claim.lost_item_id);
      return res.json({ success: true, passed: true, score: result.score });
    }

    // Failed — increment strike counter
    const newFailed = (user.failed_claims || 0) + 1;
    const suspended = newFailed >= 3;
    await supabase.from('users').update({ failed_claims: newFailed, is_suspended: suspended }).eq('id', user.id);
    await supabase.from('claims').update({ status: 'Rejected', verification_score: result.score }).eq('id', claimId);

    return res.json({ success: false, passed: false, score: result.score, attemptsUsed: newFailed, suspended });
  } catch (err) { next(err); }
});

// POST /api/matches/confirm-handover/:claimId — both parties must confirm
router.post('/confirm-handover/:claimId', protect, async (req, res, next) => {
  try {
    const { data: claim } = await supabase.from('claims').select('*').eq('id', req.params.claimId).single();
    if (!claim) return res.status(404).json({ error: 'Not found.' });
    const user = req.dbUser;

    if (claim.status === 'Resolved') {
      return res.status(400).json({ error: 'Claim is already resolved.' });
    }

    const isLoser = claim.claimant_id === user.id;
    const update  = isLoser ? { loster_confirmed: true } : { founder_confirmed: true };

    const { data: updated } = await supabase
      .from('claims').update(update).eq('id', claim.id).select().single();

    if (updated.loster_confirmed && updated.founder_confirmed) {
      await Promise.all([
        supabase.from('claims').update({ status: 'Resolved' }).eq('id', claim.id),
        supabase.from('lost_items').update({ status: 'Resolved' }).eq('id', claim.lost_item_id),
        supabase.from('found_items').update({ status: 'Resolved' }).eq('id', claim.found_item_id),
      ]);

      // +10 trust to current user
      const newScore = (user.trust_score || 0) + 10;
      const newLevel = newScore >= 100 ? 'Gold' : newScore >= 50 ? 'Silver' : 'Bronze';
      await supabase.from('users').update({ trust_score: newScore, trust_level: newLevel }).eq('id', user.id);

      // +10 trust to other party
      const { data: foundItem } = await supabase
        .from('found_items').select('user_id').eq('id', claim.found_item_id).single();
      const otherUserId = isLoser ? foundItem?.user_id : claim.claimant_id;

      if (otherUserId && otherUserId !== user.id) {
        const { data: other } = await supabase.from('users').select('*').eq('id', otherUserId).single();
        if (other) {
          const oScore = (other.trust_score || 0) + 10;
          const oLevel = oScore >= 100 ? 'Gold' : oScore >= 50 ? 'Silver' : 'Bronze';
          await supabase.from('users').update({ trust_score: oScore, trust_level: oLevel }).eq('id', otherUserId);
        }
      }

      return res.json({ success: true, bothConfirmed: true });
    }

    res.json({ success: true, bothConfirmed: false });
  } catch (err) { next(err); }
});

// POST /api/matches/dismiss/:claimId — claimant only
router.post('/dismiss/:claimId', protect, async (req, res, next) => {
  try {
    const user = req.dbUser;

    const { data: claim } = await supabase.from('claims').select('claimant_id').eq('id', req.params.claimId).single();
    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    if (claim.claimant_id !== user.id) {
      return res.status(403).json({ error: 'You can only dismiss your own claims.' });
    }

    await supabase.from('claims').delete().eq('id', req.params.claimId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/matches/resolve/:claimId — finder verifies OTP and resolves the claim
router.post('/resolve/:claimId', protect, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: 'OTP is required.' });
    }

    const { data: claim, error: claimErr } = await supabase
      .from('claims')
      .select('*, found_items(*)')
      .eq('id', req.params.claimId)
      .single();

    if (claimErr || !claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    if (claim.status !== 'Verified') {
      return res.status(400).json({ error: 'Claim must be Verified to be resolved.' });
    }

    const user = req.dbUser;
    const finderId = claim.found_items?.user_id;

    if (!finderId || finderId !== user.id) {
      return res.status(403).json({ error: 'Only the finder can resolve the claim with OTP.' });
    }

    if (claim.handover_otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid handover OTP.' });
    }

    // Update statuses to Resolved
    await Promise.all([
      supabase.from('claims').update({ status: 'Resolved' }).eq('id', claim.id),
      supabase.from('lost_items').update({ status: 'Resolved' }).eq('id', claim.lost_item_id),
      supabase.from('found_items').update({ status: 'Resolved' }).eq('id', claim.found_item_id),
    ]);

    // +10 trust to current user (finder)
    const newScore = (user.trust_score || 0) + 10;
    const newLevel = newScore >= 100 ? 'Gold' : newScore >= 50 ? 'Silver' : 'Bronze';
    await supabase.from('users').update({ trust_score: newScore, trust_level: newLevel }).eq('id', user.id);

    // +10 trust to claimant
    const claimantId = claim.claimant_id;
    if (claimantId && claimantId !== user.id) {
      const { data: claimant } = await supabase.from('users').select('*').eq('id', claimantId).single();
      if (claimant) {
        const oScore = (claimant.trust_score || 0) + 10;
        const oLevel = oScore >= 100 ? 'Gold' : oScore >= 50 ? 'Silver' : 'Bronze';
        await supabase.from('users').update({ trust_score: oScore, trust_level: oLevel }).eq('id', claimantId);
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
