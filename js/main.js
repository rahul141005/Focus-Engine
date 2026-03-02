// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Main Entry Point
//  ES Module entry — single initialization flow
// ═══════════════════════════════════════════════════════════════════════

import { init, AppAPI } from './bootstrap.js';

// ─── Global Error Handling ─────────────────────────────────────────────

function showGlobalError(message) {
  const el = document.getElementById('startupError');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 8000);
  }
}

window.addEventListener('unhandledrejection', function(event) {
  console.error('[FE] Unhandled promise rejection:', event.reason);
  showGlobalError('An unexpected error occurred. Some features may not work correctly.');
});

window.addEventListener('error', function(event) {
  console.error('[FE] Global error:', event.message, event.filename, event.lineno);
  showGlobalError('An unexpected error occurred. Some features may not work correctly.');
});

// Expose public API globally for inline onclick handlers in HTML
window.App = AppAPI;

// ─── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
