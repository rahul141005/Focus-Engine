// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — NoteCard Component (Premium Redesign)
// ═══════════════════════════════════════════════════════════════════════

import { SUBJECT_COLORS } from '../../config/constants.js';
import { esc, fmtTime, fmtMins } from '../../utils/formatUtils.js';
import { parseLocalDate } from '../../utils/timeUtils.js';

export function renderNoteCard(note) {
  const color = SUBJECT_COLORS[note.subject] || SUBJECT_COLORS.Other;
  const dateLabel = note.date
    ? parseLocalDate(note.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  // Find matching session for duration & mode
  const session = note.sessionId && window.__feState
    ? window.__feState.sessions.find(s => s.id === note.sessionId)
    : null;
  const durationLabel = session ? fmtTime(session.duration_seconds) : '';
  const modeBadge = session && session.mode === 'perQuestion' ? 'Timed Q' : (session ? 'Full' : '');
  const subNoteLabel = note.subNote || (session && session.subNote) || '';

  // Question breakdown (if available from questionAnalytics)
  const qaRecord = note.sessionId && window.__feState
    ? window.__feState.questionAnalytics.find(q => q.sessionId === note.sessionId)
    : null;

  let questionBreakdownHtml = '';
  if (qaRecord && qaRecord.questions && qaRecord.questions.length > 0) {
    const avgSecs = Math.round(qaRecord.questions.reduce((a, q) => a + q.seconds, 0) / qaRecord.questions.length);
    questionBreakdownHtml = `<div class="note-card-qa-section">
      <div class="note-card-qa-toggle" onclick="event.stopPropagation(); this.parentElement.classList.toggle('open')">
        <svg class="note-card-qa-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,6 15,12 9,18"/></svg>
        <span>${qaRecord.questions.length} questions · avg ${fmtTime(avgSecs)}</span>
      </div>
      <div class="note-card-qa-list">
        ${qaRecord.questions.map(q => {
          const slow = q.seconds > avgSecs * 1.5 ? ' slow' : '';
          return `<div class="note-card-qa-item">
            <span class="note-card-qa-num">${q.skipped ? 'Skip' : 'Q' + q.number}</span>
            <span class="note-card-qa-time${slow}">${fmtTime(q.seconds)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  return `<div class="note-card" data-note-id="${note.id}">
    <div class="note-card-header" onclick="App.toggleNoteExpand('${note.id}')">
      <div class="note-card-meta">
        <div class="note-card-subject" style="color:${color}">${esc(note.subject)}</div>
        <div class="note-card-topic">${esc(note.topic)}${subNoteLabel ? ` <span class="note-card-subnote">· ${esc(subNoteLabel)}</span>` : ''}</div>
        <div class="note-card-meta-row">
          ${dateLabel ? `<span class="note-card-date">${dateLabel}</span>` : ''}
          ${durationLabel ? `<span class="note-card-duration">${durationLabel}</span>` : ''}
          ${modeBadge ? `<span class="note-card-mode-badge">${modeBadge}</span>` : ''}
        </div>
      </div>
      <div class="note-card-actions" onclick="event.stopPropagation()">
        <button class="note-card-btn" onclick="App.openEditNote('${note.id}')" title="Edit">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="note-card-btn note-card-btn-delete" onclick="App.deleteSessionNote('${note.id}')" title="Delete">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>
    <div class="note-card-preview">${esc(note.text)}</div>
    <div class="note-card-divider"></div>
    <div class="note-card-full">${esc(note.text)}</div>
    ${questionBreakdownHtml}
  </div>`;
}
