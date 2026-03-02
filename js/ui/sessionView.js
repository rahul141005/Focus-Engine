// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Session View (Summary Overlay)
// ═══════════════════════════════════════════════════════════════════════

import { state, appLocals } from '../core/appState.js';
import { fmtTime } from '../utils/formatUtils.js';
import { uid, todayStr } from '../utils/timeUtils.js';
import { DB } from '../services/storageService.js';
import { toast } from './toastController.js';

export function showSessionSummary(record, questions, mode) {
  const statsEl = document.getElementById('summaryStats');
  const detailsEl = document.getElementById('summaryDetails');
  const overlay = document.getElementById('sessionSummaryOverlay');
  if (!statsEl || !detailsEl || !overlay) return;
  if (!Array.isArray(questions)) questions = [];
  const totalMins = Math.floor(record.duration_seconds / 60);
  const totalSecs = record.duration_seconds % 60;

  let statsHtml = `
    <div class="summary-stat-card">
      <div class="summary-stat-value">${fmtTime(record.duration_seconds)}</div>
      <div class="summary-stat-label">Total Time</div>
    </div>
    <div class="summary-stat-card">
      <div class="summary-stat-value">${record.subject}</div>
      <div class="summary-stat-label">Subject</div>
    </div>`;

  if (mode === 'perQuestion' && questions.length > 0) {
    const avgSecs = Math.round(questions.reduce((a, q) => a + q.seconds, 0) / questions.length);
    statsHtml += `
      <div class="summary-stat-card">
        <div class="summary-stat-value">${questions.length}</div>
        <div class="summary-stat-label">Questions</div>
      </div>
      <div class="summary-stat-card">
        <div class="summary-stat-value">${fmtTime(avgSecs)}</div>
        <div class="summary-stat-label">Avg / Question</div>
      </div>`;
  }

  statsEl.innerHTML = statsHtml;

  let detailsHtml = '';
  if (mode === 'perQuestion' && questions.length > 0) {
    const avgSecs = Math.round(questions.reduce((a, q) => a + q.seconds, 0) / questions.length);
    detailsHtml += '<div class="summary-section-title">Question Breakdown</div>';
    detailsHtml += questions.map(q => {
      const slow = q.seconds > avgSecs * 1.5 ? ' slow' : '';
      return `<div class="summary-question-item">
        <div class="summary-question-num">${q.skipped ? 'Skipped' : 'Q' + q.number}</div>
        <div class="summary-question-time${slow}">${fmtTime(q.seconds)}</div>
      </div>`;
    }).join('');
  }
  detailsEl.innerHTML = detailsHtml;

  const notesHtml = `<div class="summary-notes-section">
    <div class="summary-section-title">Session Notes</div>
    <textarea class="summary-notes-input" id="summaryNotesInput" placeholder="Any insights, observations, or things to remember..." rows="3"></textarea>
  </div>`;
  detailsEl.innerHTML += notesHtml;

  appLocals.lastSessionRecord = record;
  overlay.classList.add('active');
}

export function closeSummary() {
  if (appLocals.savingNotes) return;
  const overlay = document.getElementById('sessionSummaryOverlay');
  const notesInput = document.getElementById('summaryNotesInput');
  if (notesInput && notesInput.value.trim() && appLocals.lastSessionRecord && appLocals.lastSessionRecord.id) {
    appLocals.savingNotes = true;
    const doneBtn = overlay.querySelector('.btn-primary');
    if (doneBtn) doneBtn.disabled = true;
    state.sessionNotes.push({
      id: uid(),
      sessionId: appLocals.lastSessionRecord.id,
      subject: appLocals.lastSessionRecord.subject,
      topic: appLocals.lastSessionRecord.topic,
      text: notesInput.value.trim(),
      date: todayStr(),
      created_at: new Date().toISOString(),
    });
    DB.save();
    toast('Note saved', 'success');
    if (doneBtn) doneBtn.disabled = false;
    appLocals.savingNotes = false;
  }
  appLocals.lastSessionRecord = null;
  overlay.classList.remove('active');
}
