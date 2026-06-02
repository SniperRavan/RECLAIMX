/* ================================================================
   ReclaimX — service-worker.js
   auth guard to break when pages loaded offline.
   ================================================================ */

const CACHE_SHELL = 'reclaimx-v4';  // bumped from v2 — forces cache refresh on update
const CACHE_API   = 'reclaimx-api-v4';

const APP_SHELL = [
  '/',

  '/login',
  '/register',
  '/dashboard',
  '/browse',
  '/matches',
  '/report-lost',
  '/report-found',
  '/profile',

  '/assets/css/global.css',
  '/assets/js/main.js',
  '/assets/js/pwa.js',
  '/assets/js/auth.js',
  '/assets/js/auth-guard.js',
  '/assets/js/firebase-config.js',

  '/assets/icons/favicon.svg',
  '/manifest.json',

  '/components/sidebar.html',
  '/components/toast.html'
];

// ── Install: pre-cache app shell ───────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ── Activate: delete stale caches ──────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_SHELL && k !== CACHE_API)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for shell, network-only for API ─────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API calls: always go to network — never serve stale API data from cache
  if (url.pathname.startsWith('/api/')) return;

  // Skip non-GET and cross-origin (except Google Fonts CDN)
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  // App shell + static assets: cache-first, background update
  e.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(res => {
        // Update the cache with the fresh response in the background
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_SHELL).then(c => c.put(request, clone));
        }
        return res;
      });

      if (cached) {
        // Return cached version immediately, update in background
        return cached;
      }

      // Nothing in cache — fetch from network
      // If that also fails (offline), fall back to a sensible page
      return networkFetch.catch(() => {
        // For page navigations, send to login rather than dashboard
        // (dashboard requires auth, login works without network for cached assets)
       if (request.headers.get('Accept')?.includes('text/html')) {
  return (
    await caches.match('/login') ||
    await caches.match('/pages/login.html') ||
    await caches.match('/index.html')
  );
}
        // For other assets, just fail
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
