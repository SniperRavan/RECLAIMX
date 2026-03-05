/* ================================================================
   ReclaimX — pwa.js
   Service worker registration, install prompt, offline queue
   ================================================================ */

(function() {
  'use strict';

  // ── 1. Register service worker ─────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('../service-worker.js');
        console.log('[PWA] Service worker registered:', reg.scope);

        // Detect new version
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              window.ReclaimX && window.ReclaimX.toast('Update available — refresh for the latest version.', 'info', 6000);
            }
          });
        });
      } catch (err) {
        console.warn('[PWA] Service worker failed:', err);
      }
    });
  }

  // ── 2. PWA Install prompt ──────────────────────────────────
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install banner after 5s
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
      font-size:0.85rem;max-width:320px;
      animation:fadeUp 0.3s ease;
    `;
    banner.innerHTML = `
      <span style="font-size:1.8rem">📱</span>
      <div style="flex:1">
        <div style="font-weight:600;margin-bottom:2px">Install ReclaimX</div>
        <div style="color:var(--text-muted);font-size:0.78rem">Add to home screen for offline access</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button onclick="window.ReclaimXPWA.install()" style="
          background:var(--accent);color:#000;border:none;
          border-radius:6px;padding:6px 12px;font-size:0.78rem;
          font-weight:600;cursor:pointer">Install</button>
        <button onclick="document.getElementById('installBanner').remove()" style="
          background:none;border:none;color:var(--text-muted);
          font-size:0.72rem;cursor:pointer">Dismiss</button>
      </div>
    `;
    document.body.appendChild(banner);
  }

  // ── 3. Offline/online detection ────────────────────────────
  function createOfflineBanner() {
    if (document.getElementById('offlineBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'offlineBanner';
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:9997;
      background:#1a0a00;border-top:1px solid rgba(251,191,36,0.3);
      color:var(--warning);padding:10px 24px;
      display:flex;align-items:center;gap:10px;font-size:0.82rem;
    `;
    banner.innerHTML = `
      <span>⚠️</span>
      <span>You are offline — forms will sync when connection returns.</span>
    `;
    document.body.appendChild(banner);
  }

  function removeOfflineBanner() {
    const b = document.getElementById('offlineBanner');
    if (b) b.remove();
  }

  window.addEventListener('offline', () => {
    createOfflineBanner();
    window.ReclaimX && window.ReclaimX.toast('You are offline. Data will sync when reconnected.', 'warning');
  });

  window.addEventListener('online', () => {
    removeOfflineBanner();
    window.ReclaimX && window.ReclaimX.toast('Back online! Syncing pending submissions…', 'success');
    syncOfflineQueue();
  });

  if (!navigator.onLine) createOfflineBanner();

  // ── 4. IndexedDB offline queue ─────────────────────────────
  const DB_NAME    = 'reclaimx_offline';
  const STORE_NAME = 'pending_submissions';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async function queueOfflineSubmission(endpoint, payload) {
    try {
      const db    = await openDB();
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add({ endpoint, payload, queuedAt: new Date().toISOString() });
      window.ReclaimX && window.ReclaimX.toast('Saved offline. Will submit when reconnected.', 'info');
    } catch (err) {
      console.error('[PWA] Queue failed:', err);
    }
  }

  async function syncOfflineQueue() {
    try {
      const db    = await openDB();
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const items = await new Promise(resolve => {
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result);
      });

      if (!items.length) return;

      let synced = 0;
      for (const item of items) {
        try {
          const res = await fetch(item.endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(item.payload)
          });
          if (res.ok) {
            const delTx    = db.transaction(STORE_NAME, 'readwrite');
            delTx.objectStore(STORE_NAME).delete(item.id);
            synced++;
          }
        } catch (e) { /* will retry next time online */ }
      }

      if (synced > 0) {
        window.ReclaimX && window.ReclaimX.toast(`${synced} offline submission(s) synced!`, 'success');
      }
    } catch (err) {
      console.error('[PWA] Sync failed:', err);
    }
  }

  // Expose API
  window.ReclaimXPWA = {
    install: async function() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('installBanner')?.remove();
      if (outcome === 'accepted') {
        window.ReclaimX && window.ReclaimX.toast('ReclaimX installed! 🎉', 'success');
      }
    },
    queue: queueOfflineSubmission,
    sync:  syncOfflineQueue,
  };

})();
