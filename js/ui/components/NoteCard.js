// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — NoteCard Component
// ═══════════════════════════════════════════════════════════════════════

import { SUBJECT_COLORS } from '../../config/constants.js';
import { esc } from '../../utils/formatUtils.js';
import { parseLocalDate } from '../../utils/timeUtils.js';

export function renderNoteCard(note) {
  const color = SUBJECT_COLORS[note.subject] || SUBJECT_COLORS.Other;
  const dateLabel = note.date
    ? parseLocalDate(note.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return `<div class="note-card" data-note-id="${note.id}">
    <div class="note-card-header" onclick="App.toggleNoteExpand('${note.id}')">
      <div class="note-card-meta">
        <div class="note-card-subject" style="color:${color}">${esc(note.subject)}</div>
        <div class="note-card-topic">${esc(note.topic)}</div>
        <div class="note-card-date">${dateLabel}</div>
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
  </div>`;
}
