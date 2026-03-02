// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Main Entry Point
//  ES Module entry — single initialization flow
// ═══════════════════════════════════════════════════════════════════════

import { init, AppAPI } from './bootstrap.js';

// Expose public API globally for inline onclick handlers in HTML
window.App = AppAPI;

// ─── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
