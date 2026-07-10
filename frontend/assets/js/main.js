// assets/js/main.js
// Global utilities. Load first on every page.
// Change API_BASE here when backend URL changes — nowhere else.

// Initialize theme from localStorage immediately to prevent layout flashes
(function () {
  const activeTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', activeTheme);
})();

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

  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

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

// Automatically load sidebar if placeholder is present and empty
(async function loadSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (placeholder && !placeholder.innerHTML.trim()) {
    try {
      const res = await fetch('/components/sidebar.html');
      if (res.ok) placeholder.innerHTML = await res.text();
    } catch (err) {
      console.warn('[Sidebar] Load failed:', err.message);
    }
  }
})();

// ── Theme toggle injection ──────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const activeTheme = localStorage.getItem('theme') || 'dark';
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'globalThemeToggle';
  toggleBtn.className = 'theme-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Toggle theme');
  toggleBtn.innerHTML = activeTheme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';

  const navCta = document.querySelector('.nav-cta');

  if (navCta) {
    // Static placement in landing page navbar CTA
    navCta.insertBefore(toggleBtn, navCta.firstChild);
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      toggleBtn.innerHTML = newTheme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    });
  } else {
    // Floating, draggable, snappable button for App pages & Login/Register
    document.body.appendChild(toggleBtn);
    makeButtonDraggableAndSnappable(toggleBtn);
  }
});

// Drag-and-snap logic for floating theme toggler
function makeButtonDraggableAndSnappable(btn) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;
  let hasMoved = false;

  // Initial style placement: bottom-right
  btn.style.position = 'fixed';
  btn.style.bottom = '28px';
  btn.style.right = '28px';
  btn.style.left = 'auto';
  btn.style.top = 'auto';
  btn.style.zIndex = '99999';
  btn.style.cursor = 'grab';
  btn.style.transition = 'none';

  const onStart = (e) => {
    isDragging = true;
    btn.style.cursor = 'grabbing';
    btn.style.transition = 'none';
    hasMoved = false;

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    const rect = btn.getBoundingClientRect();
    startX = clientX;
    startY = clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    // Shift layout styles to absolute left/top for tracking
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    btn.style.left = `${initialLeft}px`;
    btn.style.top = `${initialTop}px`;

    // Only prevent default on touch to stop scrolling, but allow mouse events
    if (e.type === 'touchstart') e.preventDefault();
  };

  const onMove = (e) => {
    if (!isDragging) return;

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasMoved = true;
    }

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    // Viewport bounds restrictions
    const size = 36;
    newLeft = Math.max(12, Math.min(window.innerWidth - size - 12, newLeft));
    newTop = Math.max(12, Math.min(window.innerHeight - size - 12, newTop));

    btn.style.left = `${newLeft}px`;
    btn.style.top = `${newTop}px`;
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    btn.style.cursor = 'grab';

    // Snap target positions with smooth transition spring
    btn.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // slight bounce feel!

    const rect = btn.getBoundingClientRect();
    const midPoint = window.innerWidth / 2;
    const snapMargin = 28;

    let finalLeft;
    if (rect.left + rect.width / 2 < midPoint) {
      // Snap to left vertical edge
      finalLeft = snapMargin;
    } else {
      // Snap to right vertical edge
      finalLeft = window.innerWidth - rect.width - snapMargin;
    }

    let finalTop = Math.max(snapMargin, Math.min(window.innerHeight - rect.height - snapMargin, rect.top));

    btn.style.left = `${finalLeft}px`;
    btn.style.top = `${finalTop}px`;

    // Toggle theme only if it was a click (not dragged)
    if (!hasMoved) {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      btn.innerHTML = newTheme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }
  };

  btn.addEventListener('mousedown', onStart);
  btn.addEventListener('touchstart', onStart, { passive: false });

  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });

  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}
