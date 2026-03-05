// backend/routes/matchRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const Claim    = require('../models/Claim');
const LostItem = require('../models/LostItem');
const User     = require('../models/User');
const { checkAnswers } = require('../utils/verificationEngine');

// GET /api/matches — get my matches
router.get('/', protect, async (req, res) => {
  try {
    const user   = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const claims = await Claim.find({ claimantId: user._id })
      .populate('lostItemId foundItemId')
      .sort('-createdAt');

    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches/verify — submit answers for claim verification
router.post('/verify', protect, async (req, res) => {
  try {
    const { claimId, answers } = req.body;
    const [claim, user] = await Promise.all([
      Claim.findById(claimId).populate('lostItemId'),
      User.findOne({ firebaseUid: req.user.uid })
    ]);

    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    if (!user)  return res.status(404).json({ error: 'User not found.' });

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended due to fraud attempts.' });
    }

    const score = checkAnswers(answers, claim.lostItemId.hiddenAttributes);
    claim.answers = answers;
    claim.verificationScore = score;

    if (score >= 0.6) {
      claim.status = 'Verified';
      await LostItem.findByIdAndUpdate(claim.lostItemId, { status: 'Pending' });
      await claim.save();
      return res.json({ success: true, passed: true, score });
    } else {
      user.failedClaims += 1;
      if (user.failedClaims >= 3) {
        user.isSuspended = true;
        console.warn(`[Fraud] User ${user.email} suspended after 3 failed claims`);
      }
      await user.save();
      claim.status = 'Rejected';
      await claim.save();
      return res.json({
        success: false, passed: false, score,
        attemptsUsed: user.failedClaims,
        suspended: user.isSuspended
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches/confirm-handover/:claimId
router.post('/confirm-handover/:claimId', protect, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    const user  = await User.findOne({ firebaseUid: req.user.uid });
    if (!claim || !user) return res.status(404).json({ error: 'Not found.' });

    if (claim.claimantId.equals(user._id)) claim.losterConfirmed  = true;
    else                                    claim.founderConfirmed = true;

    if (claim.losterConfirmed && claim.founderConfirmed) {
      claim.status = 'Resolved';
      await LostItem.findByIdAndUpdate(claim.lostItemId, { status: 'Resolved' });

      // Award trust points
      user.trustScore += 10;
      if (user.trustScore >= 100)     user.trustLevel = 'Gold';
      else if (user.trustScore >= 50) user.trustLevel = 'Silver';
      await user.save();
    }

    await claim.save();
    res.json({ success: true, claim });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches/dismiss/:claimId
router.post('/dismiss/:claimId', protect, async (req, res) => {
  try {
    await Claim.findByIdAndDelete(req.params.claimId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
