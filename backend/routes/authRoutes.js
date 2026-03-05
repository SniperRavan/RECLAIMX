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

module.exports = router;
