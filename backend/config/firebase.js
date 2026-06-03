// backend/config/firebase.js
// Firebase Admin SDK initialisation.
// Production: reads individual env vars (set in Render dashboard).
// Local dev:  falls back to serviceAccountKey.json in this folder.
const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_PRIVATE_KEY) {
  // PRODUCTION — individual env vars
  serviceAccount = {
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Render stores literal \n — replace with real newlines
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('[Firebase] Missing required env vars (PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).');
    process.exit(1);
  }
} else {
  // LOCAL — fallback to JSON key file
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch {
    console.error('[Firebase] serviceAccountKey.json not found and no env vars set.');
    process.exit(1);
  }
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('[Firebase] Admin SDK initialized ✅');
  } catch (err) {
    console.error('[Firebase] Init error ❌:', err.message);
    process.exit(1);
  }
}

module.exports = admin;
