// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Timer Engine
//  ONLY module that uses setInterval / clearInterval
// ═══════════════════════════════════════════════════════════════════════

import { state, session, appLocals } from '../core/appState.js';
import { fmtTime } from '../utils/formatUtils.js';

// ─── Clock ─────────────────────────────────────────────────────────────

export function startClock() {
  updateClock();
  clearInterval(appLocals.clockRef);
  appLocals.clockRef = setInterval(updateClock, 1000);
}

export function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();

  document.getElementById('liveTime').textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

  document.getElementById('liveDate').textContent =
    now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  const name = state.settings.userName;
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = name ? `${g}, ${name}` : g;

  const [eh, em] = (state.settings.dayEndTime || '23:00').split(':').map(Number);
  const [sh, sm] = (state.settings.dayStartTime || '06:00').split(':').map(Number);
  const endSecs   = eh * 3600 + em * 60;
  const startSecs = sh * 3600 + sm * 60;
  const nowSecs   = h * 3600 + m * 60 + now.getSeconds();

  let remaining = endSecs - nowSecs;
  if (remaining < 0) remaining = 0;

  const totalDay = endSecs - startSecs;
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalDay));

  const circumference = 2 * Math.PI * 74;
  const ring = document.getElementById('ringProgress');
  ring.setAttribute('stroke-dasharray', circumference);
  ring.setAttribute('stroke-dashoffset', circumference * (1 - progress));

  const hue = Math.round(240 - progress * 160);
  ring.style.stroke = `hsl(${hue}, 80%, 65%)`;

  const remH = Math.floor(remaining / 3600);
  const remM = Math.floor((remaining % 3600) / 60);
  document.getElementById('ringValue').textContent = `${remH}h ${remM}m`;
  document.getElementById('ringEnd').textContent = `ends at ${state.settings.dayEndTime}`;
}

// ─── Session Timer ─────────────────────────────────────────────────────

function tickSession() {
  if (!session.active || session.paused) return;
  session.elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  document.getElementById('sessionTimer').textContent = fmtTime(session.elapsed);

  if (session.mode === 'perQuestion' && session.currentQuestionStart) {
    session.questionElapsed = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
    const qtEl = document.getElementById('questionTimer');
    if (qtEl) qtEl.textContent = fmtTime(session.questionElapsed);
  }
}

export function startSessionTimer() {
  if (session.timerRef) { clearInterval(session.timerRef); }
  session.timerRef = setInterval(tickSession, 1000);

  // Guard against background tab freeze — recalculate on visibility restore
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

function _onVisibilityChange() {
  if (document.visibilityState === 'visible' && session.active && !session.paused) {
    tickSession();
  }
}

export function stopSessionTimer() {
  clearInterval(session.timerRef);
  session.timerRef = null;
  document.removeEventListener('visibilitychange', _onVisibilityChange);
}
