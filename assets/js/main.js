/* ================================================================
   ReclaimX — main.js
   Global utilities: toast, scroll effects, animations, validation
   ================================================================ */

window.ReclaimX = window.ReclaimX || {};

// ── Toast System ───────────────────────────────────────────────
window.ReclaimX.toast = function(message, type, duration) {
  type     = type     || 'success';
  duration = duration || 4000;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span style="width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0;margin-top:1px;
      background:${type === 'success' ? 'var(--accent-dim)' : type === 'error' ? 'rgba(255,77,109,0.15)' : type === 'warning' ? 'rgba(251,191,36,0.15)' : 'var(--violet-dim)'};
      color:${type === 'success' ? 'var(--accent)' : type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--violet)'}"
    >${ICONS[type] || '✓'}</span>
    <span>${message}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;

  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));

  let timer = setTimeout(() => dismiss(toast), duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => { timer = setTimeout(() => dismiss(toast), 1500); });

  function dismiss(el) {
    el.style.animation = 'none';
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
  });
}

// ── Auto active nav link (sidebar) ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    if (link.dataset.page === current) link.classList.add('active');
  });
});

// ── Scroll-triggered animations ───────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity    = '1';
      entry.target.style.transform  = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.item-card, .card, .stat-card').forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  observer.observe(el);
});

// ── Relative time formatter ───────────────────────────────────
window.ReclaimX.timeAgo = function(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Sensitive data detector ───────────────────────────────────
const SENSITIVE_PATTERNS = [
  /\b\d{12}\b/,               // Aadhaar
  /\b\d{16}\b/,               // ATM / card
  /\b[A-Z]{5}\d{4}[A-Z]\b/,  // PAN
  /\b[A-Z]{3}\d{7}\b/,       // Voter ID
  /\b\d{10}\b/                // Phone
];

window.ReclaimX.hasSensitiveData = function(text) {
  if (!text) return false;
  return SENSITIVE_PATTERNS.some(p => p.test(text));
};

// ── Disposable email checker ──────────────────────────────────
const BLOCKED_DOMAINS = ['mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','yopmail.com'];
window.ReclaimX.isDisposableEmail = function(email) {
  const domain = (email || '').split('@')[1] || '';
  return BLOCKED_DOMAINS.includes(domain.toLowerCase());
};

// ── API base URL ──────────────────────────────────────────────
window.API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://YOUR-RAILWAY-URL.up.railway.app'; // ← replace after deploy

console.log('[ReclaimX] main.js loaded · API:', window.API_BASE);
