// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Toast Controller
// ═══════════════════════════════════════════════════════════════════════

export function toast(msg, type='') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const TOAST_ICONS = { success: '✓', error: '✗', warning: '⚠' };
  const icon = TOAST_ICONS[type] || 'ℹ';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  iconSpan.textContent = icon;
  el.appendChild(iconSpan);
  const span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.opacity='0';
    el.style.transform='translateY(-8px)';
    el.style.transition='all 0.3s ease';
    setTimeout(()=>el.remove(), 300);
  }, 2800);
}
