const admin = require('firebase-admin');
let serviceAccount;
if (process.env.FIREBASE_PRIVATE_KEY) {
  // PRODUCTION: individual env vars
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
  // Validate required env vars
  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    console.error(
      '[Firebase] Missing required Firebase environment variables.'
    );
    process.exit(1);
  }
} else {
  // LOCAL: fallback to JSON file
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (err) {
    console.error(
      '[Firebase] serviceAccountKey.json not found and no env vars set.'
    );
    process.exit(1); // fail fast
  }
}
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[Firebase] Admin SDK initialized ✅');
  } catch (error) {
    console.error('[Firebase] Init error ❌:', error.message);
    process.exit(1); // fail fast
  }
}
module.exports = admin;
