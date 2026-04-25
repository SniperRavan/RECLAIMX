// backend/routes/authRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const supabase = require('../config/supabase');
const admin    = require('../config/firebase');

// POST /api/auth/session — verify Firebase token + upsert user in DB
router.post('/session', async (req, res, next) => {
  try {
    const { idToken, campusId, name } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    const decoded = await admin.auth().verifyIdToken(idToken);

    // Check if user already exists
    let { data: user } = await supabase
      .from('users').select('*').eq('firebase_uid', decoded.uid).single();
    if (user) return res.json({ success: true, user });

    // Create new user
    const { data: newUser, error } = await supabase.from('users').insert({
      firebase_uid: decoded.uid,
      name:         name || decoded.name || decoded.email.split('@')[0],
      email:        decoded.email,
      campus_id:    campusId || 'campus_a',
      photo:        decoded.picture || ''
    }).select().single();

    if (error) {
      // Handle race condition — two requests creating the same user simultaneously
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('users').select('*').eq('firebase_uid', decoded.uid).single();
        return res.json({ success: true, user: existing });
      }
      throw error;
    }

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — get current user profile
router.get('/me', protect, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users').select('*').eq('firebase_uid', req.user.uid).single();
    if (error || !user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    if (!req.body.email) return res.status(400).json({ error: 'Email required.' });
    await admin.auth().generatePasswordResetLink(req.body.email);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile — update display name
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, photo } = req.body;
    const updates = {};
    if (name  && name.trim())  updates.name  = name.trim();
    if (photo && photo.trim()) updates.photo = photo.trim();

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const { data: user, error } = await supabase
      .from('users').update(updates)
      .eq('firebase_uid', req.user.uid)
      .select().single();

    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/avatar — upload profile photo to Cloudinary
//
// ERR-001 FIX:
// Original code: const photoUrl = req.file.path;
// Problem: multer.memoryStorage() stores the file in req.file.buffer, NOT .path.
// req.file.path is undefined with memoryStorage — so every upload silently wrote
// undefined to the database and nothing ever reached Cloudinary.
// Fix: call uploadToCloudinary(req.file.buffer) and use result.url.
const { upload, uploadToCloudinary } = require('../config/cloudinary');

router.post('/avatar', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });

    // FIX: was req.file.path (always undefined with memoryStorage)
    const result   = await uploadToCloudinary(req.file.buffer, 'reclaimx/avatars');
    const photoUrl = result.url;

    const { data: user, error } = await supabase
      .from('users').update({ photo: photoUrl })
      .eq('firebase_uid', req.user.uid)
      .select().single();

    if (error) throw error;
    res.json({ success: true, photoUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;