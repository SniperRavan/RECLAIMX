const admin = require('firebase-admin');

// Check if we have the private key in Environment Variables first (better for production)
const serviceAccount = process.env.FIREBASE_PRIVATE_KEY 
  ? {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  : require('./serviceAccountKey.json'); // Fallback to local file

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Admin SDK initialized ✅');
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error.message);
  }
}

module.exports = admin;