// assets/js/auth.js
// ──────────────────────────────────────────────────────────────
// Auth utilities: session guard, token refresh, logout helper.
// Include on any protected page: <script src="../assets/js/auth.js"></script>
// ──────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── Auth guard: redirect to login if no session ─────────────
  window.ReclaimXAuth = {
    requireAuth: function () {
      const user = JSON.parse(sessionStorage.getItem('rx_user') || 'null');
      if (!user) {
        window.location.replace('login.html');
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
      window.location.href = 'login.html';
    },

    // Auto-refresh Firebase token every 50 min (expires at 60 min)
    startTokenRefresh: async function () {
      const refresh = async () => {
        try {
          const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          const auth  = getAuth();
          const fbUser = auth.currentUser;
          if (fbUser) {
            const newToken = await fbUser.getIdToken(true);
            sessionStorage.setItem('rx_token', newToken);
          }
        } catch (err) {
          console.warn('[Auth] Token refresh failed:', err.message);
        }
      };
      setInterval(refresh, 50 * 60 * 1000); // every 50 min
    },
  };

})();
