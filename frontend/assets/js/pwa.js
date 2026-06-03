// assets/js/pwa.js
// Service worker registration, PWA install prompt, offline queue.

(function () {
  'use strict';

  // ── 1. Service worker ─────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[PWA] SW registered:', reg.scope);

        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              window.ReclaimX?.toast('Update available — refresh for latest version.', 'info', 6000);
            }
          });
        });
      } catch (err) {
        console.warn('[PWA] SW failed:', err);
      }
    });
  }

  // ── 2. Install prompt ─────────────────────────────────────
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(showInstallBanner, 5000);
  });

  function showInstallBanner() {
    if (!deferredPrompt) return;
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.style.cssText = `
      position:fixed;bottom:80px;right:24px;z-index:9998;
      background:var(--bg-card);border:1px solid var(--border);
      border-radius:var(--radius-lg);padding:16px 20px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
      display:flex;align-items:center;gap:14px;
      font-size:0.85rem;max-width:320px;animation:fadeUp 0.3s ease;`;
    banner.innerHTML = `
      <span style="font-size:1.8rem">📱</span>
      <div style="flex:1">
        <div style="font-weight:600;margin-bottom:2px">Install ReclaimX</div>
        <div style="color:var(--text-muted);font-size:0.78rem">Add to home screen for offline access</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button onclick="window.ReclaimXPWA.install()" style="background:var(--accent);color:#000;
          border:none;border-radius:6px;padding:6px 12px;font-size:0.78rem;font-weight:600;cursor:pointer">
          Install
        </button>
        <button onclick="document.getElementById('installBanner').remove()" style="background:none;
          border:none;color:var(--text-muted);font-size:0.72rem;cursor:pointer">Dismiss</button>
      </div>`;
    document.body.appendChild(banner);
  }

  // ── 3. Offline / online banner ────────────────────────────
  function createOfflineBanner() {
    if (document.getElementById('offlineBanner')) return;
    const b = document.createElement('div');
    b.id = 'offlineBanner';
    b.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:9997;
      background:#1a0a00;border-top:1px solid rgba(251,191,36,0.3);
      color:var(--warning);padding:10px 24px;display:flex;align-items:center;
      gap:10px;font-size:0.82rem;`;
    b.innerHTML = `<span>⚠️</span><span>You are offline — forms will sync when connection returns.</span>`;
    document.body.appendChild(b);
  }

  window.addEventListener('offline', () => {
    createOfflineBanner();
    window.ReclaimX?.toast('You are offline. Data will sync when reconnected.', 'warning');
  });
  window.addEventListener('online', () => {
    document.getElementById('offlineBanner')?.remove();
    window.ReclaimX?.toast('Back online! Syncing pending submissions…', 'success');
    syncOfflineQueue();
  });
  if (!navigator.onLine) createOfflineBanner();

  // ── 4. IndexedDB offline queue ────────────────────────────
  const DB_NAME = 'reclaimx_offline', STORE = 'pending_submissions';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function queueOfflineSubmission(endpoint, payload) {
    try {
      const db = await openDB();
      db.transaction(STORE, 'readwrite').objectStore(STORE).add({
        endpoint, payload,
        token:    sessionStorage.getItem('rx_token') || '',
        queuedAt: new Date().toISOString(),
      });
      window.ReclaimX?.toast('Saved offline. Will submit when reconnected.', 'info');
    } catch (err) {
      console.error('[PWA] Queue failed:', err);
    }
  }

  async function syncOfflineQueue() {
    try {
      const db    = await openDB();
      const items = await new Promise(resolve => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result);
      });
      if (!items.length) return;

      let freshToken = null;
      try { freshToken = await window.getToken(); } catch { /* use stored */ }

      let synced = 0;
      for (const item of items) {
        try {
          const token = freshToken || item.token || '';
          const res   = await fetch(item.endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            body:    JSON.stringify(item.payload),
          });
          if (res.ok) {
            db.transaction(STORE, 'readwrite').objectStore(STORE).delete(item.id);
            synced++;
          }
        } catch { /* retry next time */ }
      }
      if (synced > 0) window.ReclaimX?.toast(`${synced} offline submission(s) synced!`, 'success');
    } catch (err) {
      console.error('[PWA] Sync failed:', err);
    }
  }

  window.ReclaimXPWA = {
    install: async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('installBanner')?.remove();
      if (outcome === 'accepted') window.ReclaimX?.toast('ReclaimX installed! 🎉', 'success');
    },
    queue: queueOfflineSubmission,
    sync:  syncOfflineQueue,
  };
})();
