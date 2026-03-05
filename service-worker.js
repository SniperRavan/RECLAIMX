/* ================================================================
   ReclaimX — service-worker.js
   Cache-first for app shell, network-first for API
   ================================================================ */

const CACHE_SHELL = 'reclaimx-v1';
const CACHE_API   = 'reclaimx-api-v1';

const APP_SHELL = [
  '/index.html',
  '/pages/dashboard.html',
  '/pages/browse.html',
  '/pages/matches.html',
  '/pages/login.html',
  '/pages/register.html',
  '/pages/report-lost.html',
  '/pages/report-found.html',
  '/pages/profile.html',
  '/assets/css/global.css',
  '/assets/js/main.js',
  '/assets/js/pwa.js',
  '/assets/icons/favicon.svg',
  '/manifest.json',
  '/components/sidebar.html',
  '/components/toast.html',
];

// ── Install: cache app shell ───────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_SHELL).then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_SHELL && k !== CACHE_API).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ─────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except Google Fonts)
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  // API: Network-first
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_API).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell: Cache-first, update in background
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        caches.open(CACHE_SHELL).then(c => c.put(request, res.clone()));
        return res;
      });
      return cached || network.catch(() => caches.match('/pages/dashboard.html'));
    })
  );
});
