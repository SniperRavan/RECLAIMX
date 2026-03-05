// backend/routes/itemRoutes.js
const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const LostItem = require('../models/LostItem');
const FoundItem= require('../models/FoundItem');
const User     = require('../models/User');
const { runMatching } = require('../ai/matchingEngine');
const { hasSensitiveData } = require('../utils/sensitiveDataFilter');

// GET /api/items — browse items (public)
router.get('/', async (req, res) => {
  try {
    const { campus, category, search } = req.query;
    const lostQ = { status: 'Lost' };
    const foundQ = { status: 'Found' };
    if (campus)   { lostQ.campusId = campus; foundQ.campusId = campus; }
    if (category) { lostQ.category = category; foundQ.category = category; }
    if (search) {
      const re = new RegExp(search, 'i');
      lostQ.itemName  = re;
      foundQ.itemName = re;
    }
    const [lost, found] = await Promise.all([
      LostItem.find(lostQ).select('itemName category status createdAt campusId lastSeenLocation').sort('-createdAt').limit(50),
      FoundItem.find(foundQ).select('itemName category status createdAt campusId foundLocation').sort('-createdAt').limit(50),
    ]);
    res.json({ lost, found });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/lost — report lost item (auth required)
router.post('/lost', protect, upload.array('images', 2), async (req, res) => {
  try {
    const { itemName, description, category, lastSeenLocation, campusId, hiddenAttributes } = req.body;

    if (hasSensitiveData(description)) {
      return res.status(400).json({ error: 'Sensitive data detected in description. Please remove it.' });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user)     return res.status(404).json({ error: 'User not found.' });
    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended.' });

    const imageUrls = (req.files || []).map(f => f.path);
    const lostItem  = await LostItem.create({
      userId: user._id, campusId, itemName, description,
      hiddenAttributes: JSON.parse(hiddenAttributes || '{}'),
      category, lastSeenLocation, imageUrls,
    });

    // Run AI matching against existing found items
    runMatching(lostItem, null);

    res.status(201).json({ success: true, item: lostItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/found — report found item (auth required)
router.post('/found', protect, upload.single('image'), async (req, res) => {
  try {
    const { itemName, description, category, foundLocation, campusId } = req.body;

    if (hasSensitiveData(description)) {
      return res.status(400).json({ error: 'Sensitive data detected. Please remove it.' });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user)     return res.status(404).json({ error: 'User not found.' });
    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended.' });

    const imageUrl  = req.file ? req.file.path : '';
    const foundItem = await FoundItem.create({
      userId: user._id, campusId, itemName,
      description, category, foundLocation, imageUrl,
    });

    // Run AI matching against existing lost items
    runMatching(null, foundItem);

    res.status(201).json({ success: true, item: foundItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
