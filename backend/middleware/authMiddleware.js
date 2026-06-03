// backend/middleware/authMiddleware.js
const admin = require('../config/firebase');

module.exports = async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }
  try {
    req.user = await admin.auth().verifyIdToken(header.split(' ')[1]);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};
