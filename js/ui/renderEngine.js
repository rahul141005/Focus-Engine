// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Render Engine
//  All major UI rendering functions
// ═══════════════════════════════════════════════════════════════════════

import { state, appLocals } from '../core/appState.js';
import { SUBJECT_COLORS } from '../config/constants.js';
import { fmtMins, esc } from '../utils/formatUtils.js';
import { todayStr, parseLocalDate } from '../utils/timeUtils.js';

// ─── Home Rendering ────────────────────────────────────────────────────

export function renderHome() {
  const today = todayStr();
  const todayDay = state.days.find(d => d.date === today);
  const label = todayDay ? todayDay.label : 'No plan for today';
  document.getElementById('todayDayLabel').textContent = label;

  const todayTasks = todayDay
    ? state.tasks.filter(t => t.day_id === todayDay.id)
    : [];

  const total = todayTasks.length;
  const done  = todayTasks.filter(t => t.status === 'completed').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('completionPct').textContent  = `${pct}%`;
  document.getElementById('completionFill').style.width = `${pct}%`;
  document.getElementById('completionStat').textContent = `${done} / ${total} tasks`;

  const subjectMap = {};
  todayTasks.forEach(t => {
    if (!subjectMap[t.subject]) subjectMap[t.subject] = { tasks: [], done: 0, total: 0 };
    subjectMap[t.subject].tasks.push(t);
    subjectMap[t.subject].total += t.estimated_minutes || 0;
    if (t.status === 'completed') subjectMap[t.subject].done += t.estimated_minutes || 0;
  });

  const list = document.getElementById('subjectList');

  if (Object.keys(subjectMap).length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" fill="none" stroke="#5a5a7a" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <div class="empty-title">No tasks for today</div>
      <div class="empty-sub">Head to Plan tab to set up today's study targets.</div>
    </div>`;
    return;
  }

  list.innerHTML = Object.entries(subjectMap).map(([subj, data]) => {
    const color = SUBJECT_COLORS[subj] || SUBJECT_COLORS.Other;
    const topics = data.tasks.map(t => esc(t.topic)).join(', ');
    const remaining = data.total - data.done;
    const pct = data.total > 0 ? (data.done / data.total) * 100 : 0;
    const allDone = remaining <= 0;

    return `<div class="subject-card">
      <div class="subject-card-top">
        <div class="subject-info">
          <div class="subject-name-row">
            <div class="subject-dot" style="background:${color}"></div>
            <div>
              <div class="subject-name">${subj}</div>
              <div class="subject-topics">${topics}</div>
            </div>
          </div>
        </div>
        <div class="subject-time ${allDone ? 'done' : ''}">
          ${allDone ? '✓ Done' : fmtMins(remaining)}
        </div>
      </div>
      <div class="subject-progress">
        <div class="subject-progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }).join('');
}

// ─── Task Row Rendering ────────────────────────────────────────────────

export function renderTaskRow(task) {
  const color = SUBJECT_COLORS[task.subject] || SUBJECT_COLORS.Other;
  const done  = task.status === 'completed';
  return `<div class="task-item" data-task-id="${task.id}">
    <div class="task-check ${done ? 'done' : ''}" onclick="App.toggleTask('${task.id}')">
      ${done ? '<svg width="12" height="12" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
    </div>
    <div class="task-info">
      <div class="task-subject" style="color:${color}">${task.subject}</div>
      <div class="task-topic" contenteditable="false" data-field="topic">${esc(task.topic)}</div>
    </div>
    <div class="task-time" contenteditable="false" data-field="minutes">${fmtMins(task.estimated_minutes || 0)}</div>
    <div class="task-actions">
      <button class="task-edit-btn" onclick="App.toggleEditTask('${task.id}')" title="Edit">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="task-delete" onclick="App.deleteTask('${task.id}')" title="Delete">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </button>
    </div>
  </div>`;
}

// ─── Plan Rendering ────────────────────────────────────────────────────

export function renderPlan() {
  const list = document.getElementById('daysList');
  const searchInput = document.getElementById('planSearchInput');
  if (searchInput && searchInput.value !== appLocals.planSearchQuery) {
    searchInput.value = appLocals.planSearchQuery;
  }

  const expandedDays = new Set();
  list.querySelectorAll('.day-card.expanded').forEach(card => {
    const id = card.id.replace('daycard-', '');
    expandedDays.add(id);
  });

  if (state.days.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" fill="none" stroke="#5a5a7a" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
        </svg>
      </div>
      <div class="empty-title">Plan is empty</div>
      <div class="empty-sub">Add study days or import a CSV plan to get started.</div>
    </div>`;
    return;
  }

  const query = appLocals.planSearchQuery.toLowerCase().trim();
  const filteredDays = query ? state.days.filter(day => {
    if (day.label && day.label.toLowerCase().includes(query)) return true;
    const tasks = state.tasks.filter(t => t.day_id === day.id);
    return tasks.some(t =>
      (t.subject && t.subject.toLowerCase().includes(query)) ||
      (t.topic && t.topic.toLowerCase().includes(query))
    );
  }) : state.days;

  if (filteredDays.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-title">No matching days</div>
      <div class="empty-sub">Try a different search term.</div>
    </div>`;
    return;
  }

  list.innerHTML = filteredDays.map((day, idx) => {
    const tasks = state.tasks.filter(t => t.day_id === day.id);
    const done  = tasks.filter(t => t.status === 'completed').length;
    const today = day.date === todayStr();

    return `<div class="day-card${expandedDays.has(day.id) ? ' expanded' : ''}" id="daycard-${day.id}">
      <div class="day-card-header" onclick="App.toggleDayCard('${day.id}')">
        <div class="day-number-badge">${esc(day.label) || `Day ${idx+1}`}</div>
        <div class="day-info">
          <div class="day-label" contenteditable="false" data-day-id="${day.id}" data-field="label">${esc(day.label)}${today ? ' <span class="badge badge-indigo">Today</span>' : ''}</div>
          <div class="day-meta">${day.date || 'No date'} · ${tasks.length} tasks · ${done}/${tasks.length} done</div>
        </div>
        <div class="day-actions" onclick="event.stopPropagation()">
          <button class="btn-icon-sm" onclick="App.toggleEditDay('${day.id}')" title="Edit day label">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon-sm" onclick="App.deleteDay('${day.id}')" title="Delete day" style="color:var(--rose)">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
        <svg class="day-chevron" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
      </div>
      <div class="day-tasks">
        ${tasks.map(task => renderTaskRow(task)).join('')}
        <div class="day-add-task" onclick="App.openAddTask('${day.id}')">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Add task
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Backlog Rendering ─────────────────────────────────────────────────

export function renderBacklog() {
  const today = todayStr();
  const pending = state.tasks.filter(t => {
    if (t.status === 'completed') return false;
    const day = state.days.find(d => d.id === t.day_id);
    if (!day || !day.date) return false;
    return day.date < today;
  });

  document.getElementById('backlogCount').textContent = pending.length;
  const totalMins = pending.reduce((a, t) => a + (t.estimated_minutes || 0), 0);
  document.getElementById('backlogMins').textContent = totalMins;

  const daysOld = pending.reduce((max, t) => {
    const day = state.days.find(d => d.id === t.day_id);
    if (!day || !day.date) return max;
    const diff = Math.floor((new Date(today) - new Date(day.date)) / 86400000);
    return Math.max(max, diff);
  }, 0);
  document.getElementById('backlogDays').textContent = daysOld;

  const sorted = [...pending].sort((a, b) => {
    if (appLocals.backlogSortBy === 'topic') return (a.topic || '').localeCompare(b.topic || '');
    if (appLocals.backlogSortBy === 'subject') return (a.subject || '').localeCompare(b.subject || '');
    const dayA = state.days.find(d => d.id === a.day_id);
    const dayB = state.days.find(d => d.id === b.day_id);
    return ((dayA && dayA.date) || '').localeCompare((dayB && dayB.date) || '');
  });

  const sortSelect = document.getElementById('backlogSortSelect');
  if (sortSelect) sortSelect.value = appLocals.backlogSortBy;

  const list = document.getElementById('pendingList');
  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" fill="none" stroke="#5a5a7a" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div class="empty-title">All caught up!</div>
      <div class="empty-sub">No overdue tasks. Keep up the great work!</div>
    </div>`;
  } else {
    list.innerHTML = sorted.map(t => {
      const color = SUBJECT_COLORS[t.subject] || SUBJECT_COLORS.Other;
      const day = state.days.find(d => d.id === t.day_id);
      return `<div class="pending-item">
        <div class="pending-dot" style="background:${color}"></div>
        <div class="pending-info">
          <div class="pending-subject" style="color:${color}">${t.subject}</div>
          <div class="pending-topic">${esc(t.topic)}</div>
          <div class="pending-origin">From ${day ? esc(day.label) : 'Unknown'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="pending-time">${fmtMins(t.estimated_minutes || 0)}</div>
          <button class="btn-reassign" onclick="App.openReassign('${t.id}')">Move</button>
        </div>
      </div>`;
    }).join('');
  }

  const rescheduledEl = document.getElementById('rescheduledList');
  const rescheduledHeader = document.getElementById('rescheduledHeader');
  if (rescheduledEl) {
    const rescheduled = state.rescheduledTopics.filter(r => {
      const task = state.tasks.find(t => t.id === r.taskId);
      return task && task.status !== 'completed';
    });
    if (rescheduled.length === 0) {
      rescheduledEl.style.display = 'none';
      if (rescheduledHeader) rescheduledHeader.style.display = 'none';
    } else {
      rescheduledEl.style.display = '';
      if (rescheduledHeader) rescheduledHeader.style.display = '';
      rescheduledEl.innerHTML = rescheduled.map(r => {
        const task = state.tasks.find(t => t.id === r.taskId);
        if (!task) return '';
        const origDay = state.days.find(d => d.id === r.originalDayId);
        const curDay = state.days.find(d => d.id === task.day_id);
        const color = SUBJECT_COLORS[task.subject] || SUBJECT_COLORS.Other;
        return `<div class="pending-item">
          <div class="pending-dot" style="background:${color}"></div>
          <div class="pending-info">
            <div class="pending-subject" style="color:${color}">${task.subject}</div>
            <div class="pending-topic">${esc(task.topic)}</div>
            <div class="pending-origin">${origDay ? esc(origDay.label) : '?'} → ${curDay ? esc(curDay.label) : '?'}</div>
          </div>
          <button class="btn-reassign" onclick="App.undoReschedule('${r.id}')">Undo</button>
        </div>`;
      }).join('');
    }
  }
}

// ─── Settings Rendering ────────────────────────────────────────────────

export function setToggleState(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', !!on);
}

export function renderSettings() {
  document.getElementById('settingEndTime').value   = state.settings.dayEndTime;
  document.getElementById('settingStartTime').value = state.settings.dayStartTime;

  const nameEl = document.getElementById('settingUserName');
  if (nameEl) nameEl.value = state.settings.userName || '';

  const n = state.settings.notifications;
  setToggleState('toggleStudyNotif',    n.study);
  setToggleState('toggleBrainFog',      n.brainFog);
  setToggleState('toggleEvening',       n.evening);
  setToggleState('togglePersonalNotif', n.personal);
  setToggleState('toggleSound',         state.settings.sound);

  document.querySelectorAll('.theme-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === state.settings.theme);
  });
}

// ─── Day Card Toggle ───────────────────────────────────────────────────

export function toggleDayCard(dayId) {
  const card = document.getElementById(`daycard-${dayId}`);
  if (card) card.classList.toggle('expanded');
}

// ─── Subject Analytics Toggle ──────────────────────────────────────────

export function toggleSubjectAnalytics(subjKey) {
  const card = document.getElementById(`sa-${subjKey}`);
  if (card) card.classList.toggle('expanded');
}

// ─── Cloud Status Display ──────────────────────────────────────────────

export function showCloudStatus(message, type) {
  const statusEl = document.getElementById('cloudStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `cloud-status ${type}`;
  statusEl.style.display = 'block';
}

// ─── CSV Selection List Rendering ──────────────────────────────────────

export function renderCSVSelectionList(dayGroups) {
  const dayKeys = Object.keys(dayGroups || appLocals.csvParsedData || {});
  const listEl = document.getElementById('csvImportList');
  if (!listEl) return;

  const data = dayGroups || appLocals.csvParsedData;
  if (!data) return;

  listEl.innerHTML = dayKeys.map((dayKey, dayIdx) => {
    const sel = appLocals.csvSelection[dayKey];
    if (!sel) return '';
    const tasks = data[dayKey];
    const dayChecked = sel.selected;

    const checkSvg12 = '<svg width="12" height="12" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>';
    const checkSvg10 = '<svg width="10" height="10" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>';

    return `<div class="csv-day-group" data-day-idx="${dayIdx}">
      <div class="csv-day-header" onclick="App.toggleCSVDay(${dayIdx})">
        <div class="csv-day-check ${dayChecked ? 'checked' : ''}" data-day-check="${dayIdx}">
          ${dayChecked ? checkSvg12 : ''}
        </div>
        <div class="csv-day-label">${esc(dayKey)}</div>
        <input type="date" class="csv-day-date-input" data-day-date="${dayIdx}" value="${sel.date}" onclick="event.stopPropagation()" onchange="App.updateCSVDayDate(${dayIdx}, this.value)">
      </div>
      <div class="csv-task-list">
        ${tasks.map((row, idx) => {
          const color = SUBJECT_COLORS[row.subject.trim()] || SUBJECT_COLORS.Other;
          const taskChecked = sel.tasks[idx];
          const subTopic = (row.sub_topic || row.subtopic || row.subnote || row.sub_note || '').trim() || null;
          return `<div class="csv-task-item" data-task-idx="${dayIdx}-${idx}">
            <div class="csv-task-check ${taskChecked ? 'checked' : ''}" data-task-check="${dayIdx}-${idx}" onclick="App.toggleCSVTask(${dayIdx},${idx})">
              ${taskChecked ? checkSvg10 : ''}
            </div>
            <div class="csv-task-info">
              <div class="csv-task-subj" style="color:${color}">${esc(row.subject.trim())}</div>
              <div class="csv-task-topic">${esc(row.topic.trim())}${subTopic ? ` <span style="color:var(--text-3);font-size:12px">· ${esc(subTopic)}</span>` : ''}</div>
            </div>
            <div class="csv-task-mins">${parseInt(row.estimated_minutes) || 0}m</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}
