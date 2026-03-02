// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Format Utilities
// ═══════════════════════════════════════════════════════════════════════

export function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function fmtMins(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m/60), rem = m%60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function fmtHHMM(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
