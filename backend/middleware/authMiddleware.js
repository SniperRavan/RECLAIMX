// backend/middleware/authMiddleware.js
const admin = require('../config/firebase');
const supabase = require('../config/supabase');

module.exports = async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(header.split(' ')[1]);
    req.user = decoded;

    // Resolve user from database
    const { data: user, error } = await supabase
      .from('users').select('*').eq('firebase_uid', decoded.uid).single();

    if (error || !user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended.' });
    }

    req.dbUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};
