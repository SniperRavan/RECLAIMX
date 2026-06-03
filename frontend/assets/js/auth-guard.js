// assets/js/auth-guard.js
// Fixes back/forward button showing cached protected pages after logout.
// Uses pageshow event which fires on bfcache restore — the only reliable
// way to catch back/forward navigation in all browsers including Safari.

(function () {
  'use strict';

  const PROTECTED = ['dashboard','browse','matches','report-lost','report-found','profile'];
  const AUTH_ONLY = ['login','register'];

  function currentPage() {
    return window.location.pathname.split('/').pop().replace('.html','') || 'index';
  }

  function hasSession() {
    return !!(sessionStorage.getItem('rx_user') && sessionStorage.getItem('rx_token'));
  }

  function guard() {
    const page = currentPage();

    if (PROTECTED.includes(page) && !hasSession()) {
      window.location.replace('/login');
      return;
    }
    if (AUTH_ONLY.includes(page) && hasSession()) {
      window.location.replace('/dashboard');
    }
  }

  // Initial load check
  guard();

  // bfcache restore — fires when user hits back/forward to a cached page
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) guard();
  });
})();
