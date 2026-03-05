// backend/config/firebase.js
// ──────────────────────────────────────────────────────────────
// Firebase Admin SDK setup
//
// SETUP STEPS:
//   1. Firebase Console → Project Settings → Service Accounts
//   2. Click "Generate New Private Key" → download JSON
//   3. Rename it to serviceAccountKey.json
//   4. Put it in: backend/config/serviceAccountKey.json
//   5. Add backend/config/serviceAccountKey.json to .gitignore ← IMPORTANT
// ──────────────────────────────────────────────────────────────

const admin = require('firebase-admin');

let serviceAccount;

try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  console.warn('[Firebase] serviceAccountKey.json not found. Auth middleware will not work until you add it.');
  console.warn('[Firebase] See backend/config/firebase.js for instructions.');
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[Firebase] Admin SDK initialized ✅');
}

module.exports = admin;
