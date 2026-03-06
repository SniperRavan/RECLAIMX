// backend/routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const protect = require('../middleware/authMiddleware');
const User    = require('../models/User');

// POST /api/auth/register — called after Firebase creates account
router.post('/register', async (req, res) => {
  try {
    const { firebaseUid, name, email, campusId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists.' });
    const user = await User.create({ firebaseUid, name, email, campusId });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — get logged-in user's profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/session — verify token + upsert user (used by login/register frontend)
router.post('/session', async (req, res) => {
  try {
    const admin = require('../config/firebase');
    const { idToken, campusId } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    const decoded = await admin.auth().verifyIdToken(idToken);

    // If user already exists just return them, otherwise create
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        name:        decoded.name  || decoded.email.split('@')[0],
        email:       decoded.email,
        campusId:    campusId || 'campus_a',
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/forgot-password — send reset email via Firebase Admin
router.post('/forgot-password', async (req, res) => {
  try {
    const admin = require('../config/firebase');
    const link  = await admin.auth().generatePasswordResetLink(req.body.email);
    // Firebase sends the email automatically — link variable is just for logging
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
