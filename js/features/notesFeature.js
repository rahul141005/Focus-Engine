// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Notes Feature (Personal Tasks & Session Notes)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { SUBJECT_COLORS, MAX_DISPLAYED_NOTES } from '../config/constants.js';
import { uid, todayStr, parseLocalDate } from '../utils/timeUtils.js';
import { esc } from '../utils/formatUtils.js';
import { DB } from '../services/storageService.js';
import { FireDB } from '../services/databaseService.js';
import { toast } from '../ui/toastController.js';
import { renderNoteCard } from '../ui/components/NoteCard.js';

export function renderPersonal() {
  const list = document.getElementById('personalList');

  const total = state.personalTasks.length;
  const done = state.personalTasks.filter(t => t.completed).length;
  const pending = total - done;
  const totalEl = document.getElementById('personalTotal');
  const pendingEl = document.getElementById('personalPending');
  const doneEl = document.getElementById('personalDone');
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (doneEl) doneEl.textContent = done;

  if (state.personalTasks.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" fill="none" stroke="#5a5a7a" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <div class="empty-title">No personal tasks</div>
      <div class="empty-sub">Add quick notes and to-dos here.</div>
    </div>`;
  } else {
    const sorted = [...state.personalTasks].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    list.innerHTML = sorted.map(task => {
      const dateLabel = task.date ? parseLocalDate(task.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
      const freq = task.frequency || 'once';
      const prio = task.priority || 'none';
      const freqBadge = freq !== 'once' ? `<span class="personal-frequency-badge">${freq === 'daily' ? 'Daily' : 'Weekly'}</span>` : '';
      const prioDot = prio !== 'none' ? `<div class="personal-priority-dot ${prio}" title="${prio} priority"></div>` : '';
      return `<div class="personal-item ${task.completed ? 'completed' : ''}">
        ${prioDot}
        <div class="personal-check ${task.completed ? 'done' : ''}" onclick="App.togglePersonalTask('${task.id}')">
          ${task.completed ? '<svg width="12" height="12" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
        </div>
        <div class="personal-text ${task.completed ? 'done' : ''}">${esc(task.text)}</div>
        ${freqBadge}
        ${dateLabel ? `<div class="personal-date">${dateLabel}</div>` : ''}
        <button class="personal-delete" onclick="App.deletePersonalTask('${task.id}')">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>`;
    }).join('');
  }

  const notesEl = document.getElementById('sessionNotesList');
  if (notesEl) {
    // Expose state for NoteCard component to look up session data
    window.__feState = state;
    if (state.sessionNotes.length === 0) {
      notesEl.innerHTML = '<div class="empty-state" style="padding:16px 0"><div class="empty-title">No notes yet</div><div class="empty-sub">Notes are added after focus sessions.</div></div>';
    } else {
      const recentNotes = [...state.sessionNotes].reverse().slice(0, MAX_DISPLAYED_NOTES);
      notesEl.innerHTML = recentNotes.map(n => renderNoteCard(n)).join('');
    }
  }
}

export async function addPersonalTask() {
  const input = document.getElementById('personalInput');
  if (!input) return;
  const text = input.value.trim();

  if (!text) return;

  const freqChip = document.querySelector('#personalFrequencyChips .personal-chip.active');
  const prioChip = document.querySelector('#personalPriorityChips .personal-chip.active');
  const frequency = freqChip ? freqChip.dataset.frequency : 'once';
  const priority = prioChip ? prioChip.dataset.priority : 'none';

  const task = {
    id: uid(),
    text,
    completed: false,
    date: todayStr(),
    created_at: new Date().toISOString(),
    frequency,
    priority,
  };

  state.personalTasks.push(task);
  DB.save();
  await FireDB.insertPersonalTask(task);

  input.value = '';
  document.querySelectorAll('#personalFrequencyChips .personal-chip').forEach(c => c.classList.toggle('active', c.dataset.frequency === 'once'));
  document.querySelectorAll('#personalPriorityChips .personal-chip').forEach(c => c.classList.toggle('active', c.dataset.priority === 'none'));
  renderPersonal();
  toast('Personal task added');
}

export async function togglePersonalTask(id) {
  const task = state.personalTasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;

  if (task.completed && task.frequency && task.frequency !== 'once') {
    const now = new Date();
    let nextDate;
    if (task.frequency === 'daily') {
      nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (task.frequency === 'weekly') {
      nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    }
    if (nextDate) {
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const newTask = {
        id: uid(),
        text: task.text,
        completed: false,
        date: `${y}-${m}-${d}`,
        created_at: new Date().toISOString(),
        frequency: task.frequency,
        priority: task.priority || 'none',
      };
      state.personalTasks.push(newTask);
      await FireDB.insertPersonalTask(newTask);
    }
  }

  DB.save();
  await FireDB.updatePersonalTask(id, { completed: task.completed });
  renderPersonal();
}

export async function deletePersonalTask(id) {
  if (!confirm('Delete this personal task?')) return;

  state.personalTasks = state.personalTasks.filter(t => t.id !== id);
  DB.save();
  await FireDB.deletePersonalTask(id);
  renderPersonal();
}
