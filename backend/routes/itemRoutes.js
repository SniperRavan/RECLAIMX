// backend/routes/itemRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const { upload, uploadToCloudinary } = require('../config/cloudinary');
const supabase = require('../config/supabase');
const { runMatchingForItem }    = require('../ai/matchingEngine');
const { sensitiveDataMiddleware } = require('../utils/sensitiveDataFilter');

// GET /api/items/me — current user's own reports
router.get('/me', protect, async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users').select('id').eq('firebase_uid', req.user.uid).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const [lostRes, foundRes] = await Promise.all([
      supabase.from('lost_items').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('found_items').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false })
    ]);

    res.json({ lost: lostRes.data || [], found: foundRes.data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/items — public browse (no auth required)
router.get('/', async (req, res, next) => {
  try {
    const { campus, category, search } = req.query;

    let lostQ = supabase
      .from('lost_items')
      .select('id,item_name,category,status,created_at,campus_id,last_seen_location')
      .eq('status', 'Lost').limit(50);

    let foundQ = supabase
      .from('found_items')
      .select('id,item_name,category,status,created_at,campus_id,found_location')
      .eq('status', 'Found').limit(50);

    if (campus)   { lostQ = lostQ.eq('campus_id', campus);   foundQ = foundQ.eq('campus_id', campus); }
    if (category) { lostQ = lostQ.eq('category', category);  foundQ = foundQ.eq('category', category); }
    if (search) {
      lostQ  = lostQ.ilike('item_name',  `%${search}%`);
      foundQ = foundQ.ilike('item_name', `%${search}%`);
    }

    const [{ data: lost }, { data: found }] = await Promise.all([lostQ, foundQ]);
    res.json({ lost: lost || [], found: found || [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/items/lost — report a lost item
//
// ERR-002 FIX:
// Original middleware order: protect → sensitiveDataMiddleware → upload.array(...)
// Problem: For multipart/form-data requests (which all image uploads use), Express
// does NOT parse req.body until multer runs. So sensitiveDataMiddleware was checking
// req.body.description, req.body.hidden_contains etc. — all of which were UNDEFINED
// at that point. The entire sensitive data check was silently skipped for every
// lost report that included an image.
// Fix: Run upload FIRST so multer parses the body, THEN check for sensitive data.
//
// Correct order: protect → upload.array() → sensitiveDataMiddleware → handler
router.post('/lost',
  protect,
  upload.array('images', 2),        // ← multer FIRST: parses multipart body
  sensitiveDataMiddleware,           // ← THEN check: req.body is now populated
  async (req, res, next) => {
    try {
      const { itemName, description, category, lastSeenLocation, campusId, hiddenAttributes } = req.body;

      if (!itemName || !category || !campusId) {
        return res.status(400).json({ error: 'itemName, category, and campusId are required.' });
      }

      const { data: user } = await supabase
        .from('users').select('*').eq('firebase_uid', req.user.uid).single();
      if (!user)             return res.status(404).json({ error: 'User not found.' });
      if (user.is_suspended) return res.status(403).json({ error: 'Account suspended due to fraud attempts.' });

      const hidden = JSON.parse(hiddenAttributes || '{}');

      // Upload images to Cloudinary (if any)
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        const results = await Promise.all(
          req.files.map(f => uploadToCloudinary(f.buffer, 'reclaimx/lost'))
        );
        imageUrls = results.map(r => r.url);
      }

      const { data: lostItem, error } = await supabase
        .from('lost_items').insert({
          user_id:             user.id,
          campus_id:           campusId,
          item_name:           itemName.trim(),
          description:         description || '',
          category,
          last_seen_location:  lastSeenLocation || '',
          image_urls:          imageUrls,
          hidden_color_inside: hidden.colorInside || '',
          hidden_unique_marks: hidden.uniqueMarks || '',
          hidden_contains:     hidden.contains    || '',
        }).select().single();

      if (error) throw error;

      // Run matching asynchronously — don't hold up the response
      runMatchingForItem(lostItem, 'lost').catch(e =>
        console.error('[ItemRoute] Async match failed:', e.message)
      );

      res.status(201).json({ success: true, item: lostItem });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/items/found — report a found item
// Same middleware order fix as /lost above
router.post('/found',
  protect,
  upload.single('image'),            // ← multer FIRST
  sensitiveDataMiddleware,           // ← THEN sensitive check
  async (req, res, next) => {
    try {
      const { itemName, description, category, foundLocation, campusId } = req.body;

      if (!itemName || !category || !campusId) {
        return res.status(400).json({ error: 'itemName, category, and campusId are required.' });
      }

      const { data: user } = await supabase
        .from('users').select('*').eq('firebase_uid', req.user.uid).single();
      if (!user)             return res.status(404).json({ error: 'User not found.' });
      if (user.is_suspended) return res.status(403).json({ error: 'Account suspended due to fraud attempts.' });

      let imageUrl = '';
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, 'reclaimx/found');
        imageUrl = result.url;
      }

      const { data: foundItem, error } = await supabase
        .from('found_items').insert({
          user_id:        user.id,
          campus_id:      campusId,
          item_name:      itemName.trim(),
          description:    description || '',
          category,
          found_location: foundLocation || '',
          image_url:      imageUrl,
        }).select().single();

      if (error) throw error;

      runMatchingForItem(foundItem, 'found').catch(e =>
        console.error('[ItemRoute] Async match failed:', e.message)
      );

      res.status(201).json({ success: true, item: foundItem });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;