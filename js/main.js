// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Main Entry Point
//  ES Module entry — single initialization flow
// ═══════════════════════════════════════════════════════════════════════

import { init, AppAPI } from './bootstrap.js';

// ─── Global Error Handling ─────────────────────────────────────────────

window.addEventListener('unhandledrejection', function(event) {
  console.error('[FE] Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', function(event) {
  console.error('[FE] Global error:', event.message, event.filename, event.lineno);
});

// Expose public API globally for inline onclick handlers in HTML
window.App = AppAPI;

// ─── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
