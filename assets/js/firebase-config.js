// assets/js/firebase-config.js
// Firebase config loaded from backend so nothing secret is hardcoded in HTML.
// ERR-004 FIX: Wrapped the config fetch in try/catch. Previously a bare top-level
// await with no error handling — if backend was cold-starting or down, the entire
// module would throw and ALL auth buttons on login/register would stop working
// silently. Now shows a user-facing "Cannot connect" error with a retry button.
//
// ERR-017 FIX: Removed the local API_BASE const. Now uses window.API_BASE
// which is set by main.js (loaded first on every page). Single source of truth.
// Previously there were two independent API_BASE definitions that could drift.

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

// Use window.API_BASE set by main.js — single source of truth
// main.js loads before any page's inline script so this is always defined
const API_BASE = window.API_BASE;

// ERR-004 FIX: was bare top-level await with no catch
// If this fails (cold start, backend down), show a friendly error instead of
// leaving the user with a blank broken page and no explanation.
let config;
try {
  const res = await fetch(`${API_BASE}/api/config/firebase`, {
    // 8 second timeout — Railway cold starts can be slow
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Config endpoint returned ${res.status}`);
  config = await res.json();
} catch (err) {
  console.error('[Firebase] Could not load config from backend:', err.message);

  // Show user-facing error — much better than a blank broken page
  // Only show this if we're on an auth page that actually needs Firebase
  const isAuthPage = document.querySelector('.auth-page, #loginForm, #registerForm');
  if (isAuthPage || document.body) {
    document.body.innerHTML = `
      <div style="
        display:flex;align-items:center;justify-content:center;
        min-height:100vh;font-family:'DM Sans',sans-serif;
        background:#060810;color:#e8edf5;text-align:center;padding:24px;
      ">
        <div>
          <div style="font-size:2.5rem;margin-bottom:16px">⚠️</div>
          <div style="font-size:1.1rem;font-weight:600;margin-bottom:8px">Cannot connect to server</div>
          <div style="font-size:0.875rem;color:#8892a4;margin-bottom:24px;max-width:320px;">
            The server may be starting up. This usually takes 10–20 seconds on first load.
          </div>
          <button onclick="location.reload()" style="
            background:#00d4aa;color:#000;border:none;
            border-radius:10px;padding:12px 28px;
            font-size:0.9rem;font-weight:600;cursor:pointer;
          ">Retry</button>
        </div>
      </div>
    `;
  }

  // Stop module execution — exports below won't be reached,
  // which is fine because the page is now showing the error UI
  throw err;
}

// Initialize Firebase app (reuse existing if already initialized)
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