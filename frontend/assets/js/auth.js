// assets/js/auth.js
// Auth utilities: session guard, token refresh helper.
// auth-guard.js handles page-level redirects — this handles per-component use.

(function () {
  'use strict';

  window.ReclaimXAuth = {
    requireAuth: function () {
      const user = JSON.parse(sessionStorage.getItem('rx_user') || 'null');
      if (!user) {
        window.location.replace('/login');
        return null;
      }
      return user;
    },

    getUser: function () {
      return JSON.parse(sessionStorage.getItem('rx_user') || 'null');
    },

    getToken: function () {
      return sessionStorage.getItem('rx_token') || null;
    },

    logout: function () {
      sessionStorage.clear();
      window.location.href = '/login';
    },

    // Auto-refresh Firebase token every 50 min (token expires at 60 min)
    startTokenRefresh: async function () {
      const refresh = async () => {
        try {
          const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          const fbUser = getAuth().currentUser;
          if (fbUser) {
            const token = await fbUser.getIdToken(true);
            sessionStorage.setItem('rx_token', token);
          }
        } catch (err) {
          console.warn('[Auth] Token refresh failed:', err.message);
        }
      };
      setInterval(refresh, 50 * 60 * 1000);
    },
  };
})();
