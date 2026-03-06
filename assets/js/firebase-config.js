// assets/js/firebase-config.js
// Firebase config is loaded from backend — nothing secret in this file

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://YOUR-RAILWAY-URL.up.railway.app';

// Fetch config from backend instead of hardcoding it here
const res    = await fetch(`${API_BASE}/api/config/firebase`);
const config = await res.json();

const app  = getApps().length ? getApps()[0] : initializeApp(config);
const auth = getAuth(app);

export {
  auth,
  API_BASE,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
};