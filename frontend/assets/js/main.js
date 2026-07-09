// assets/js/main.js
// Global utilities. Load first on every page.
// Change API_BASE here when backend URL changes — nowhere else.

window.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://reclaimx.onrender.com';

// ── Token refresh ─────────────────────────────────────────────
window.getToken = async function () {
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth }                = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    let app;
    if (getApps().length) {
      app = getApps()[0];
    } else {
      try {
        const r = await fetch(`${window.API_BASE}/api/config/firebase`);
        if (!r.ok) throw new Error('Config fetch failed');
        app = initializeApp(await r.json());
      } catch {
        return sessionStorage.getItem('rx_token');
      }
    }

    const auth = getAuth(app);
    if (auth.currentUser) {
      const fresh = await auth.currentUser.getIdToken(true);
      sessionStorage.setItem('rx_token', fresh);
      return fresh;
    }
  } catch (e) {
    console.warn('[getToken] failed:', e.message);
  }
  return sessionStorage.getItem('rx_token');
};

window.ReclaimX = window.ReclaimX || {};

// ── Toast ─────────────────────────────────────────────────────
window.ReclaimX.toast = function (message, type, duration) {
  type     = type     || 'success';
  duration = duration || 4000;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const ICONS  = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const COLORS = {
    success: 'var(--accent)', error: 'var(--danger)',
    warning: 'var(--warning)', info: 'var(--violet)',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span style="width:18px;height:18px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0;margin-top:1px;
      background:${COLORS[type]}22;color:${COLORS[type]}">${ICONS[type] || '✓'}</span>
    <span>${message}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;
  container.appendChild(toast);

  const dismiss = (el) => {
    el.style.cssText += 'opacity:0;transform:translateX(60px);transition:all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));
  let timer = setTimeout(() => dismiss(toast), duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => { timer = setTimeout(() => dismiss(toast), 1500); });
};

// ── Navbar scroll (public pages only) ────────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── Card entrance animations ──────────────────────────────────
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity    = '1';
      entry.target.style.transform  = 'translateY(0)';
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

// ── Relative time ─────────────────────────────────────────────
window.ReclaimX.timeAgo = function (dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Sensitive data detector ───────────────────────────────────
const SENSITIVE_PATTERNS = [
  /\b\d{12}\b/, /\b\d{16}\b/, /\b[A-Z]{5}\d{4}[A-Z]\b/,
  /\b[A-Z]{3}\d{7}\b/, /\b\d{10}\b/,
];

window.ReclaimX.hasSensitiveData = function (text) {
  if (!text) return false;
  const norm = text.replace(/[\s\-]/g, '');
  return SENSITIVE_PATTERNS.some(p => p.test(text) || p.test(norm));
};

// ── Disposable email checker ──────────────────────────────────
const BLOCKED = ['mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','yopmail.com'];
window.ReclaimX.isDisposableEmail = function (email) {
  return BLOCKED.includes(((email || '').split('@')[1] || '').toLowerCase());
};

console.log('[ReclaimX] main.js loaded · API:', window.API_BASE);

// ── Sidebar init (runs when sidebar HTML injected via fetch) ──
async function initSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar || sidebar.dataset.initialized) return;
  sidebar.dataset.initialized = 'true';

  // Active link — match clean URL path OR .html filename
  const pathPart = window.location.pathname.split('/').pop().replace('.html', '') ||
                   window.location.pathname.split('/').filter(Boolean).pop() || 'dashboard';

  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    const page = link.dataset.page.replace('.html', '');
    link.classList.toggle('active', page === pathPart);
  });

  function getTrustBadge(score) {
    const svgBase = `<svg style="width:14px;height:14px;vertical-align:middle;margin-right:4px;transform:translateY(-1px)" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="{fill}" stroke="{stroke}"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
    if (score >= 100) return svgBase.replace('{fill}','rgba(251,191,36,0.1)').replace('{stroke}','#FBBF24') + ' Gold Hero';
    if (score >= 50)  return svgBase.replace('{fill}','rgba(148,163,184,0.1)').replace('{stroke}','#94A3B8') + ' Silver Helper';
    return svgBase.replace('{fill}','rgba(217,119,6,0.1)').replace('{stroke}','#D97706') + ' Bronze Helper';
  }

  const stored = JSON.parse(sessionStorage.getItem('rx_user') || 'null');
  if (stored) {
    const name     = stored.name || stored.email || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const avatarEl = document.getElementById('sidebarAvatar');
    if (avatarEl) {
      avatarEl.innerHTML = stored.photo
        ? `<img src="${stored.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer"/>`
        : initials;
    }

    const nameEl = document.getElementById('sidebarName');
    const lvlEl  = document.getElementById('sidebarLevel');
    if (nameEl) nameEl.textContent = name;
    if (lvlEl)  lvlEl.innerHTML    = getTrustBadge(stored.trust_score || 0);

    let token;
    try   { token = await window.getToken(); }
    catch { token = sessionStorage.getItem('rx_token'); }

    if (token) {
      fetch(`${window.API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          if (data.name && nameEl)    nameEl.textContent = data.name;
          if (lvlEl)                  lvlEl.innerHTML    = getTrustBadge(data.trust_score || 0);
        })
        .catch(() => {});

      fetch(`${window.API_BASE}/api/matches`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(claims => {
          const pending = Array.isArray(claims) ? claims.filter(c => c.status === 'Pending').length : 0;
          const badge   = document.getElementById('sidebarMatchBadge');
          if (badge && pending > 0) {
            badge.textContent    = pending > 9 ? '9+' : pending;
            badge.style.display  = '';
          }
        })
        .catch(() => {});
    }
  }

  document.getElementById('sidebarLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = '/login';
  });

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

  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    const menuBtn = document.getElementById('menuBtn');
    if (sidebar.classList.contains('open')
      && !sidebar.contains(e.target)
      && menuBtn && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('open');
      sidebar.style.display = '';
    }
  });
}

const sidebarObserver = new MutationObserver(() => {
  if (document.getElementById('appSidebar')) initSidebar();
});
sidebarObserver.observe(document.body, { childList: true, subtree: true });
