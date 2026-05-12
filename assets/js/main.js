/* ================================================================
    ReclaimX — main.js
    Global utilities: API base, toast, scroll effects, validation
    
    ERR-017 FIX: window.API_BASE is the single source of truth.
    firebase-config.js now reads window.API_BASE instead of defining its own copy.
    When you get your Render URL, change it HERE and ONLY here.
    
    ERR-018 FIX: initSidebar() now calls await window.getToken() instead of
    reading sessionStorage directly — ensures token is fresh (not expired).
    
    ERR-019 FIX: initSidebar() now fetches match count and shows the badge.
   ================================================================ */

// ── Single source of truth for API URL ────────────────────────
// ERR-017 FIX: This is the ONLY place where API_BASE is defined.
// firebase-config.js imports it from window.API_BASE (not its own copy).
// Change this one line when you deploy to Ra:ilway.
window.API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:5000'
  : 'https://reclaimx.onrender.com'; // ← replace with your actual Render URL after deployment

// ── Auto-refresh Firebase token before API calls ───────────────
window.getToken = async function() {
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

    let app;
    if (getApps().length) {
      app = getApps()[0];
    } else {
      try {
        const r = await fetch(`${window.API_BASE}/api/config/firebase`);
        if (!r.ok) throw new Error('Config fetch failed');
        const config = await r.json();
        app = initializeApp(config);
      } catch(e) {
        return sessionStorage.getItem('rx_token');
      }
    }

    const auth = getAuth(app);
    if (auth.currentUser) {
      const freshToken = await auth.currentUser.getIdToken(true);
      sessionStorage.setItem('rx_token', freshToken);
      return freshToken;
    }
  } catch(e) {
    console.warn('[getToken] failed:', e.message);
  }
  return sessionStorage.getItem('rx_token');
};

window.ReclaimX = window.ReclaimX || {};

// ── Toast System ───────────────────────────────────────────────
window.ReclaimX.toast = function(message, type, duration) {
  type     = type     || 'success';
  duration = duration || 4000;

  // Look for the container — it may be injected via toast.html or hardcoded
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const COLORS = { success: 'var(--accent)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--violet)' };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span style="width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:0.7rem;font-weight:700;flex-shrink:0;margin-top:1px;
      background:${COLORS[type]}22;color:${COLORS[type]}">${ICONS[type] || '✓'}</span>
    <span>${message}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;
  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));

  let timer = setTimeout(() => dismiss(toast), duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => { timer = setTimeout(() => dismiss(toast), 1500); });

  function dismiss(el) {
    el.style.opacity   = '0';
    el.style.transform = 'translateX(60px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }
};

// ── Navbar scroll effect (public pages) ───────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── Scroll-triggered card animations ─────────────────────────
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity   = '1';
      entry.target.style.transform = 'translateY(0)';
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.item-card, .card, .stat-card').forEach(el => {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(16px)';
  el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  animObserver.observe(el);
});

// ── Relative time formatter ───────────────────────────────────
window.ReclaimX.timeAgo = function(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Sensitive data detector ───────────────────────────────────
const SENSITIVE_PATTERNS = [
  /\b\d{12}\b/,              // Aadhaar
  /\b\d{16}\b/,              // ATM / card
  /\b[A-Z]{5}\d{4}[A-Z]\b/, // PAN
  /\b[A-Z]{3}\d{7}\b/,      // Voter ID
  /\b\d{10}\b/               // Phone
];

window.ReclaimX.hasSensitiveData = function(text) {
  if (!text) return false;
  const normalised = text.replace(/[\s\-]/g, ''); // catch spaced-out numbers too
  return SENSITIVE_PATTERNS.some(p => p.test(text) || p.test(normalised));
};

// ── Disposable email checker ──────────────────────────────────
const BLOCKED_DOMAINS = ['mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','yopmail.com'];
window.ReclaimX.isDisposableEmail = function(email) {
  const domain = (email || '').split('@')[1] || '';
  return BLOCKED_DOMAINS.includes(domain.toLowerCase());
};

console.log('[ReclaimX] main.js loaded · API:', window.API_BASE);

// ── Sidebar Initialization ─────────────────────────────────────
async function initSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar || sidebar.dataset.initialized) return;
  sidebar.dataset.initialized = 'true';

  // Active link
  let current = window.location.pathname.split('/').pop() || 'dashboard';
  current = current.replace('.html', ''); // Strip extension from the URL if it exists

  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    const targetPage = link.dataset.page.replace('.html', ''); // Strip extension from the HTML data attribute
    link.classList.toggle('active', targetPage === current);
  });

  // Helper to generate SVG Trust Badges dynamically
  function getTrustBadge(score) {
    if (score >= 100) return `<svg style="width:14px;height:14px;vertical-align:middle;margin-right:4px;transform:translateY(-1px)" viewBox="0 0 24 24" fill="rgba(251,191,36,0.1)" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Gold Hero`;
    if (score >= 50)  return `<svg style="width:14px;height:14px;vertical-align:middle;margin-right:4px;transform:translateY(-1px)" viewBox="0 0 24 24" fill="rgba(148,163,184,0.1)" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Silver Helper`;
    return `<svg style="width:14px;height:14px;vertical-align:middle;margin-right:4px;transform:translateY(-1px)" viewBox="0 0 24 24" fill="rgba(217,119,6,0.1)" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Bronze Helper`;
  }

  // User info from sessionStorage (instant display)
  const stored = JSON.parse(sessionStorage.getItem('rx_user') || 'null');
  if (stored) {
    const name     = stored.name || stored.email || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const trust    = stored.trust_score || 0;

    const avatarEl = document.getElementById('sidebarAvatar');
    if (stored.photo && avatarEl) {
      avatarEl.innerHTML = `<img src="${stored.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`;
    } else if (avatarEl) {
      avatarEl.textContent = initials;
    }

    const nameEl = document.getElementById('sidebarName');
    const lvlEl  = document.getElementById('sidebarLevel');
    if (nameEl) nameEl.textContent = name;
    
    // FIX: Using innerHTML so the SVG renders as an image, not raw text code
    if (lvlEl)  lvlEl.innerHTML  = getTrustBadge(trust);

    let token;
    try { token = await window.getToken(); } 
    catch(e) { token = sessionStorage.getItem('rx_token'); }

    if (token) {
      // Update user info from live backend data
      fetch(`${window.API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          if (data.name  && nameEl) nameEl.textContent = data.name;
          const liveScore = data.trust_score || 0;
          // FIX: Using innerHTML here too!
          if (lvlEl) lvlEl.innerHTML = getTrustBadge(liveScore);
        })
        .catch(() => {}); 

      // Fetch matches count
      fetch(`${window.API_BASE}/api/matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : [])
        .then(claims => {
          const pending = Array.isArray(claims)
            ? claims.filter(c => c.status === 'Pending').length
            : 0;
          const badge = document.getElementById('sidebarMatchBadge');
          if (badge && pending > 0) {
            badge.textContent    = pending > 9 ? '9+' : pending;
            badge.style.display  = '';
          }
        })
        .catch(() => {});
    }
  }

  // Logout button
  const logoutBtn = document.getElementById('sidebarLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // Mobile close button
  const closeBtn = document.getElementById('sidebarClose');
  if (closeBtn) {
    const updateClose = () => { closeBtn.style.display = window.innerWidth <= 900 ? 'block' : 'none'; };
    updateClose();
    window.addEventListener('resize', updateClose);
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebar.style.display = '';
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    const menuBtn = document.getElementById('menuBtn');
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        menuBtn && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('open');
      sidebar.style.display = '';
    }
  });
}

// Watch for sidebar injection (it's fetched async in each page)
const sidebarObserver = new MutationObserver(() => {
  if (document.getElementById('appSidebar')) initSidebar();
});
sidebarObserver.observe(document.body, { childList: true, subtree: true });
