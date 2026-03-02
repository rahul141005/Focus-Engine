// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Session Engine
//  Session lifecycle management
// ═══════════════════════════════════════════════════════════════════════

import { state, session } from '../core/appState.js';
import { SUBJECT_COLORS, MIN_SESSION_SECONDS } from '../config/constants.js';
import { uid, todayStr } from '../utils/timeUtils.js';
import { fmtTime, fmtMins, esc } from '../utils/formatUtils.js';
import { DB } from '../services/storageService.js';
import { FireDB } from '../services/databaseService.js';
import { startSessionTimer, stopSessionTimer } from './timerEngine.js';

// ─── UI callbacks injected by bootstrap (avoids core→ui dependency) ────
const _ui = {
  toast: () => {},
  openSheet: () => {},
  closeSheet: () => {},
  renderHome: () => {},
  renderBacklog: () => {},
  renderProgress: () => {},
  showSessionSummary: () => {},
};

export function registerSessionUI(callbacks) {
  Object.assign(_ui, callbacks);
}

function playEndTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
    osc.onended = () => ctx.close();
  } catch(e) { console.warn('[FE] playEndTone failed:', e); }
}

export function startSessionFlow() {
  if (session.active) {
    _ui.toast('A session is already running', '');
    return;
  }
  const today = todayStr();
  const todayDay = state.days.find(d => d.date === today);
  const pending = todayDay
    ? state.tasks.filter(t => t.day_id === todayDay.id && t.status === 'pending')
    : [];

  const backlog = state.tasks.filter(t => {
    if (t.status === 'completed') return false;
    const day = state.days.find(d => d.id === t.day_id);
    return day && day.date && day.date < today;
  });

  const allAvailable = [...pending, ...backlog];

  if (allAvailable.length === 0) {
    _ui.toast('No pending tasks — great job!', 'success');
    return;
  }

  const list = document.getElementById('sessionSubjectList');
  list.innerHTML = allAvailable.map(t => {
    const color = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.Other;
    const day = state.days.find(d => d.id === t.day_id);

    const topicSessions = state.sessions.filter(s => s.topic === t.topic && s.subject === t.subject);
    const completedSecs = topicSessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    const completedMins = Math.floor(completedSecs / 60);
    const estMins = t.estimated_minutes || 0;
    const remainMins = Math.max(0, estMins - completedMins);

    const lastSession = topicSessions.length > 0 ? topicSessions[topicSessions.length - 1] : null;
    const lastInfo = lastSession
      ? `Last: ${lastSession.session_date} · ${fmtMins(Math.floor(lastSession.duration_seconds / 60))}`
      : '';

    return `<div class="session-pick-item" onclick="App.startSession('${t.id}')">
      <div class="pick-dot" style="background:${color}"></div>
      <div class="pick-info">
        <div class="pick-subj" style="color:${color}">${t.subject}</div>
        <div class="pick-topic">${esc(t.topic)}</div>
        <div class="pick-meta">
          <span>Est: ${fmtMins(estMins)}</span>
          ${completedMins > 0 ? `<span>Done: ${fmtMins(completedMins)}</span>` : ''}
          ${remainMins > 0 && completedMins > 0 ? `<span>Left: ${fmtMins(remainMins)}</span>` : ''}
        </div>
        ${lastInfo ? `<div class="pick-last">${lastInfo}</div>` : ''}
        ${day && day.date !== today ? `<div style="font-size:11px;color:var(--text-3)">From ${esc(day.label)}</div>` : ''}
      </div>
      <div class="pick-time">${fmtMins(estMins)}</div>
    </div>`;
  }).join('');
  _ui.openSheet('sheetSessionPicker');
}

export function startSession(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  _ui.closeSheet();

  session.taskId    = taskId;
  session.subject   = task.subject;
  session.topic     = task.topic;
  session.sub_topic = task.sub_topic || null;

  _ui.openSheet('sheetSessionMode');
}

export function startSessionWithMode(mode) {
  const task = state.tasks.find(t => t.id === session.taskId);
  if (!task) return;

  _ui.closeSheet();

  session.active    = true;
  session.paused    = false;
  session.startTime = Date.now();
  session.elapsed   = 0;
  session.mode      = mode;
  session.questions = [];
  session.questionIndex = 0;
  session.currentQuestionStart = Date.now();
  session.questionElapsed = 0;

  document.getElementById('sessionSubject').textContent = task.subject;
  document.getElementById('sessionTopic').textContent   = task.topic;

  const subTopicEl = document.getElementById('sessionSubTopic');
  if (subTopicEl) {
    subTopicEl.textContent = session.sub_topic || '';
    subTopicEl.style.display = session.sub_topic ? '' : 'none';
  }

  document.getElementById('sessionTimer').textContent   = '00:00';
  document.getElementById('sessionStatus').textContent  = 'RUNNING';
  document.getElementById('btnPauseSession').textContent = 'Pause';
  document.getElementById('sessionOverlay').classList.add('active');

  const modeBtn = document.getElementById('btnSwitchMode');
  if (modeBtn) modeBtn.textContent = mode === 'full' ? 'Timed Q' : 'Full';

  const pqPanel = document.getElementById('perQuestionPanel');
  if (mode === 'perQuestion') {
    pqPanel.style.display = '';
    document.getElementById('questionNumber').textContent = '1';
    document.getElementById('questionTimer').textContent = '00:00';
  } else {
    pqPanel.style.display = 'none';
  }

  startSessionTimer();

  try {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch(e) {}
}

export function pauseSession() {
  if (!session.active) return;
  if (!session.paused) {
    session.paused  = true;
    session.pausedAt = Date.now();
    document.getElementById('btnPauseSession').textContent = 'Resume';
    document.getElementById('sessionStatus').textContent  = 'PAUSED';
  } else {
    const pausedDuration = Date.now() - session.pausedAt;
    session.startTime += pausedDuration;
    if (session.mode === 'perQuestion' && session.currentQuestionStart) {
      session.currentQuestionStart += pausedDuration;
    }
    session.paused   = false;
    session.pausedAt = null;
    document.getElementById('btnPauseSession').textContent = 'Pause';
    document.getElementById('sessionStatus').textContent  = 'RUNNING';
  }
}

export function switchSessionMode() {
  if (!session.active) return;

  const pqPanel = document.getElementById('perQuestionPanel');
  const modeBtn = document.getElementById('btnSwitchMode');

  if (session.mode === 'perQuestion') {
    if (!session.paused && session.currentQuestionStart) {
      session.questionElapsed = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
    }
    session.mode = 'full';
    pqPanel.style.display = 'none';
  } else {
    session.mode = 'perQuestion';
    if (session.paused) {
      session.currentQuestionStart = session.pausedAt - (session.questionElapsed * 1000);
    } else {
      session.currentQuestionStart = Date.now() - (session.questionElapsed * 1000);
    }
    pqPanel.style.display = '';
    document.getElementById('questionNumber').textContent = session.questionIndex + 1;
    document.getElementById('questionTimer').textContent = fmtTime(session.questionElapsed);
  }

  if (modeBtn) modeBtn.textContent = session.mode === 'full' ? 'Timed Q' : 'Full';
  _ui.toast(`Switched to ${session.mode === 'full' ? 'Full' : 'Timed Q'} mode`);
}

export async function endSession() {
  if (!session.active) return;
  session.active = false;
  stopSessionTimer();

  // Disable end session button to prevent double submission
  const endBtn = document.getElementById('btnEndSession');
  if (endBtn) endBtn.disabled = true;

  if (session.paused) {
    const pausedDuration = Date.now() - session.pausedAt;
    session.startTime += pausedDuration;
    if (session.mode === 'perQuestion' && session.currentQuestionStart) {
      session.currentQuestionStart += pausedDuration;
    }
    session.paused = false;
    session.pausedAt = null;
  }

  if (session.mode === 'perQuestion' && session.currentQuestionStart) {
    const qTime = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
    if (qTime > 0) {
      session.questions[session.questionIndex] = { number: session.questionIndex + 1, seconds: qTime, skipped: false };
    }
  }

  const finalElapsed = Math.max(0, Math.floor((Date.now() - session.startTime) / 1000));
  document.getElementById('sessionOverlay').classList.remove('active');
  document.getElementById('perQuestionPanel').style.display = 'none';

  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
  } catch(e) {}

  if (finalElapsed < MIN_SESSION_SECONDS) {
    session.questions = [];
    session.questionIndex = 0;
    session.questionElapsed = 0;
    session.mode = 'full';
    session.sub_topic = null;
    session.taskId = null;
    session.subject = '';
    session.topic = '';
    session.pausedAt = null;
    session.currentQuestionStart = null;
    if (endBtn) endBtn.disabled = false;
    _ui.toast('Session too short (< 2 min) — not saved', 'warning');
    return;
  }

  const record = {
    id: uid(),
    subject: session.subject,
    topic: session.topic,
    sub_topic: session.sub_topic || null,
    duration_seconds: finalElapsed,
    session_date: todayStr(),
    mode: session.mode,
    created_at: new Date().toISOString(),
  };

  state.sessions.push(record);

  const task = state.tasks.find(t => t.id === session.taskId);
  if (task) {
    const sesMins = Math.floor(finalElapsed / 60);
    if (sesMins >= (task.estimated_minutes || 0) * 0.8) {
      task.status = 'completed';
      await FireDB.updateTask(task.id, { status: 'completed' });
    }
  }

  let qaRecord = null;
  if (session.mode === 'perQuestion' && session.questions.length > 0) {
    const validQuestions = session.questions.filter(q => q !== undefined);
    qaRecord = {
      id: uid(),
      sessionId: record.id,
      subject: session.subject,
      topic: session.topic,
      sub_topic: session.sub_topic || null,
      date: todayStr(),
      questions: validQuestions,
      created_at: new Date().toISOString(),
    };
    state.questionAnalytics.push(qaRecord);
  }

  DB.save();
  await FireDB.insertSession(record);
  if (qaRecord) {
    await FireDB.insertQuestionAnalytics(qaRecord);
  }

  const summaryQuestions = session.questions.filter(q => q !== undefined);
  const summaryMode = session.mode;

  session.paused = false;
  session.taskId = null;
  session.pausedAt = null;
  session.currentQuestionStart = null;
  session.questions = [];
  session.questionIndex = 0;
  session.questionElapsed = 0;
  session.mode = 'full';
  session.sub_topic = null;

  _ui.renderHome();
  _ui.renderProgress();
  _ui.renderBacklog();

  _ui.showSessionSummary(record, summaryQuestions, summaryMode);

  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  if (state.settings.sound) playEndTone();

  // Re-enable end session button
  if (endBtn) endBtn.disabled = false;
}
