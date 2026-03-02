// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Debounce Utility
// ═══════════════════════════════════════════════════════════════════════

export function debounce(fn, ms) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
