// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Time Utilities
// ═══════════════════════════════════════════════════════════════════════

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    Math.random().toString(36).slice(2) + Date.now();
}

export function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  return new Date(dateStr + 'T00:00:00');
}
