// backend/routes/authRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const supabase = require('../config/supabase');
const admin    = require('../config/firebase');
const { upload, uploadToCloudinary } = require('../config/cloudinary');

// POST /api/auth/session — verify Firebase token + upsert user
router.post('/session', async (req, res, next) => {
  try {
    const { idToken, campusId, name } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required.' });

    const decoded = await admin.auth().verifyIdToken(idToken);

    let { data: user } = await supabase
      .from('users').select('*').eq('firebase_uid', decoded.uid).single();
    if (user) return res.json({ success: true, user });

    const { data: newUser, error } = await supabase.from('users').insert({
      firebase_uid: decoded.uid,
      name:         name || decoded.name || decoded.email.split('@')[0],
      email:        decoded.email,
      campus_id:    campusId || 'campus_a',
      photo:        decoded.picture || '',
    }).select().single();

    if (error) {
      // Race condition — another request already created the user
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('users').select('*').eq('firebase_uid', decoded.uid).single();
        return res.json({ success: true, user: existing });
      }
      throw error;
    }

    res.status(201).json({ success: true, user: newUser });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users').select('*').eq('firebase_uid', req.user.uid).single();
    if (error || !user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    if (!req.body.email) return res.status(400).json({ error: 'Email required.' });
    await admin.auth().generatePasswordResetLink(req.body.email);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /api/auth/profile — update name and/or photo
// FIX: use 'photo' in req.body so empty string clears the photo
router.put('/profile', protect, async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name  && req.body.name.trim())  updates.name  = req.body.name.trim();
    if ('photo' in req.body)                      updates.photo = req.body.photo ?? '';

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const { data: user, error } = await supabase
      .from('users').update(updates).eq('firebase_uid', req.user.uid).select().single();
    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

// POST /api/auth/avatar — upload profile photo to Cloudinary
router.post('/avatar', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });

    const result   = await uploadToCloudinary(req.file.buffer, 'reclaimx/avatars');
    const photoUrl = result.url;

    const { data: user, error } = await supabase
      .from('users').update({ photo: photoUrl }).eq('firebase_uid', req.user.uid).select().single();
    if (error) throw error;
    res.json({ success: true, photoUrl });
  } catch (err) { next(err); }
});

module.exports = router;
