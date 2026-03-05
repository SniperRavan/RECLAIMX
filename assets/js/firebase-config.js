// assets/js/firebase-config.js
// ──────────────────────────────────────────────────────────────
// Shared Firebase initialization for all frontend pages.
// Import auth functions from here instead of initializing
// Firebase separately in each page.
//
// SETUP: Replace all PASTE_YOUR_* values with your actual
// Firebase config from:
// Firebase Console → Project Settings → Your apps → firebaseConfig
// ──────────────────────────────────────────────────────────────

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── PASTE YOUR FIREBASE CONFIG BELOW ─────────────────────────
const firebaseConfig = {
  apiKey:            "PASTE_YOUR_apiKey",
  authDomain:        "PASTE_YOUR_authDomain",
  projectId:         "PASTE_YOUR_projectId",
  storageBucket:     "PASTE_YOUR_storageBucket",
  messagingSenderId: "PASTE_YOUR_messagingSenderId",
  appId:             "PASTE_YOUR_appId",
};
// ─────────────────────────────────────────────────────────────

// Prevent re-initialization if this file is imported multiple times
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
