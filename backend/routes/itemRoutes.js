// backend/routes/itemRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const { upload, uploadToCloudinary } = require('../config/cloudinary');
const supabase = require('../config/supabase');
const { runMatchingForItem }      = require('../ai/matchingEngine');
const { sensitiveDataMiddleware } = require('../utils/sensitiveDataFilter');

// GET /api/items/me — current user's reports
router.get('/me', protect, async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users').select('id').eq('firebase_uid', req.user.uid).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const [lostRes, foundRes] = await Promise.all([
      supabase.from('lost_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('found_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    res.json({ lost: lostRes.data || [], found: foundRes.data || [] });
  } catch (err) { next(err); }
});

// GET /api/items — public browse
router.get('/', async (req, res, next) => {
  try {
    const { campus, category, search } = req.query;

    let lostQ = supabase.from('lost_items')
      .select('id,item_name,category,status,created_at,campus_id,last_seen_location')
      .eq('status', 'Lost').limit(50);

    let foundQ = supabase.from('found_items')
      .select('id,item_name,category,status,created_at,campus_id,found_location')
      .eq('status', 'Found').limit(50);

    if (campus)   { lostQ = lostQ.eq('campus_id', campus);   foundQ = foundQ.eq('campus_id', campus); }
    if (category) { lostQ = lostQ.eq('category', category);  foundQ = foundQ.eq('category', category); }
    if (search)   { lostQ = lostQ.ilike('item_name', `%${search}%`); foundQ = foundQ.ilike('item_name', `%${search}%`); }

    const [{ data: lost }, { data: found }] = await Promise.all([lostQ, foundQ]);
    res.json({ lost: lost || [], found: found || [] });
  } catch (err) { next(err); }
});

// POST /api/items/lost
// multer BEFORE sensitiveDataMiddleware — body not populated until multer runs
router.post('/lost', protect, upload.array('images', 2), sensitiveDataMiddleware, async (req, res, next) => {
  try {
    const { itemName, description, category, lastSeenLocation, campusId, hiddenAttributes } = req.body;
    if (!itemName || !category || !campusId) {
      return res.status(400).json({ error: 'itemName, category, and campusId are required.' });
    }

    const { data: user } = await supabase.from('users').select('*').eq('firebase_uid', req.user.uid).single();
    if (!user)             return res.status(404).json({ error: 'User not found.' });
    if (user.is_suspended) return res.status(403).json({ error: 'Account suspended.' });

    const hidden = JSON.parse(hiddenAttributes || '{}');

    let imageUrls = [];
    if (req.files?.length) {
      const results = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer, 'reclaimx/lost')));
      imageUrls = results.map(r => r.url);
    }

    const { data: lostItem, error } = await supabase.from('lost_items').insert({
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

    // Run matching asynchronously — don't block response
    runMatchingForItem(lostItem, 'lost').catch(e =>
      console.error('[ItemRoute] Match failed:', e.message)
    );

    res.status(201).json({ success: true, item: lostItem });
  } catch (err) { next(err); }
});

// POST /api/items/found
router.post('/found', protect, upload.single('image'), sensitiveDataMiddleware, async (req, res, next) => {
  try {
    const { itemName, description, category, foundLocation, campusId } = req.body;
    if (!itemName || !category || !campusId) {
      return res.status(400).json({ error: 'itemName, category, and campusId are required.' });
    }

    const { data: user } = await supabase.from('users').select('*').eq('firebase_uid', req.user.uid).single();
    if (!user)             return res.status(404).json({ error: 'User not found.' });
    if (user.is_suspended) return res.status(403).json({ error: 'Account suspended.' });

    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'reclaimx/found');
      imageUrl = result.url;
    }

    const { data: foundItem, error } = await supabase.from('found_items').insert({
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
      console.error('[ItemRoute] Match failed:', e.message)
    );

    res.status(201).json({ success: true, item: foundItem });
  } catch (err) { next(err); }
});

// DELETE /api/items/lost/:id — owner only, cascades claims
router.delete('/lost/:id', protect, async (req, res, next) => {
  try {
    const { data: user } = await supabase.from('users').select('id').eq('firebase_uid', req.user.uid).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { data: item } = await supabase.from('lost_items').select('id,user_id').eq('id', req.params.id).single();
    if (!item)                    return res.status(404).json({ error: 'Item not found.' });
    if (item.user_id !== user.id) return res.status(403).json({ error: 'You can only delete your own reports.' });

    await supabase.from('claims').delete().eq('lost_item_id', req.params.id);
    const { error } = await supabase.from('lost_items').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/items/found/:id — owner only, cascades claims
router.delete('/found/:id', protect, async (req, res, next) => {
  try {
    const { data: user } = await supabase.from('users').select('id').eq('firebase_uid', req.user.uid).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { data: item } = await supabase.from('found_items').select('id,user_id').eq('id', req.params.id).single();
    if (!item)                    return res.status(404).json({ error: 'Item not found.' });
    if (item.user_id !== user.id) return res.status(403).json({ error: 'You can only delete your own reports.' });

    await supabase.from('claims').delete().eq('found_item_id', req.params.id);
    const { error } = await supabase.from('found_items').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
