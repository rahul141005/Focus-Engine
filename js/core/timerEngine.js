// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Timer Engine
//  ONLY module that uses setInterval / clearInterval
// ═══════════════════════════════════════════════════════════════════════

import { state, session, appLocals } from '../core/appState.js';
import { fmtTime } from '../utils/formatUtils.js';

// ─── Cached DOM refs (resolved once, avoids getElementById every tick) ─
let _clockEls = null;
let _sessionEls = null;

function getClockEls() {
  if (!_clockEls) {
    _clockEls = {
      time:     document.getElementById('liveTime'),
      date:     document.getElementById('liveDate'),
      greeting: document.getElementById('greeting'),
      ring:     document.getElementById('ringProgress'),
      ringVal:  document.getElementById('ringValue'),
      ringEnd:  document.getElementById('ringEnd'),
    };
  }
  return _clockEls;
}

function getSessionEls() {
  if (!_sessionEls) {
    _sessionEls = {
      timer: document.getElementById('sessionTimer'),
      qTimer: document.getElementById('questionTimer'),
    };
  }
  return _sessionEls;
}

// ─── Clock ─────────────────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 74;

export function startClock() {
  updateClock();
  clearInterval(appLocals.clockRef);
  appLocals.clockRef = setInterval(updateClock, 1000);
}

export function updateClock() {
  const els = getClockEls();
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();

  els.time.textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

  els.date.textContent =
    now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  const name = state.settings.userName;
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  els.greeting.textContent = name ? `${g}, ${name}` : g;

  const [eh, em] = (state.settings.dayEndTime || '23:00').split(':').map(Number);
  const [sh, sm] = (state.settings.dayStartTime || '06:00').split(':').map(Number);
  const endSecs   = eh * 3600 + em * 60;
  const startSecs = sh * 3600 + sm * 60;
  const nowSecs   = h * 3600 + m * 60 + now.getSeconds();

  let remaining = endSecs - nowSecs;
  if (remaining < 0) remaining = 0;

  const totalDay = endSecs - startSecs;
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalDay));

  els.ring.setAttribute('stroke-dasharray', CIRCUMFERENCE);
  els.ring.setAttribute('stroke-dashoffset', CIRCUMFERENCE * (1 - progress));

  const hue = Math.round(240 - progress * 160);
  els.ring.style.stroke = `hsl(${hue}, 80%, 65%)`;

  const remH = Math.floor(remaining / 3600);
  const remM = Math.floor((remaining % 3600) / 60);
  els.ringVal.textContent = `${remH}h ${remM}m`;
  els.ringEnd.textContent = `ends at ${state.settings.dayEndTime}`;
}

// ─── Session Timer ─────────────────────────────────────────────────────

function tickSession() {
  if (!session.active || session.paused) return;
  session.elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const els = getSessionEls();
  els.timer.textContent = fmtTime(session.elapsed);

  if (session.mode === 'perQuestion' && session.currentQuestionStart) {
    session.questionElapsed = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
    if (els.qTimer) els.qTimer.textContent = fmtTime(session.questionElapsed);
  }
}

export function startSessionTimer() {
  if (session.timerRef) { clearInterval(session.timerRef); }
  session.timerRef = setInterval(tickSession, 1000);

  // Guard against background tab freeze — recalculate on visibility restore
  // Remove before adding to prevent duplicate listeners
  document.removeEventListener('visibilitychange', _onVisibilityChange);
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
