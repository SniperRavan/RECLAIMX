// assets/js/firebase-config.js
// Loads Firebase config from backend so nothing secret lives in HTML.
// Shows retry UI if backend is cold-starting (Render free tier ~30s delay).

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const API_BASE = window.API_BASE; // set by main.js

let config;
try {
  const res = await fetch(`${API_BASE}/api/config/firebase`, {
    signal: AbortSignal.timeout(8000), // 8s — handles Render cold start
  });
  if (!res.ok) throw new Error(`Config returned ${res.status}`);
  config = await res.json();
} catch (err) {
  console.error('[Firebase] Could not load config:', err.message);
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;
      min-height:100vh;font-family:'DM Sans',sans-serif;background:#060810;
      color:#e8edf5;text-align:center;padding:24px;">
      <div>
        <div style="font-size:2.5rem;margin-bottom:16px">⚠️</div>
        <div style="font-size:1.1rem;font-weight:600;margin-bottom:8px">Cannot connect to server</div>
        <div style="font-size:0.875rem;color:#8892a4;margin-bottom:24px;max-width:320px;">
          The server may be starting up. This usually takes 10–20 seconds on first load.
        </div>
        <button onclick="location.reload()" style="background:#00d4aa;color:#000;border:none;
          border-radius:10px;padding:12px 28px;font-size:0.9rem;font-weight:600;cursor:pointer;">
          Retry
        </button>
      </div>
    </div>`;
  throw err; // stop module — exports won't be reached, page shows retry UI
}

const app  = getApps().length ? getApps()[0] : initializeApp(config);
const auth = getAuth(app);

export {
  auth, API_BASE,
  GoogleAuthProvider, GithubAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged,
};
