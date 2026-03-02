// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Plan Feature (Day/Task Management, CSV Import)
// ═══════════════════════════════════════════════════════════════════════

import { state, appLocals } from '../core/appState.js';
import { SUBJECT_COLORS, SEARCH_DEBOUNCE_MS } from '../config/constants.js';
import { uid, todayStr } from '../utils/timeUtils.js';
import { fmtMins, esc } from '../utils/formatUtils.js';
import { debounce } from '../utils/debounce.js';
import { DB } from '../services/storageService.js';
import { FireDB } from '../services/databaseService.js';
import { toast } from '../ui/toastController.js';
import { openSheet, closeSheet } from '../ui/modalController.js';
import { renderPlan, renderHome, renderBacklog, renderCSVSelectionList } from '../ui/renderEngine.js';

// ─── Task Management ───────────────────────────────────────────────────

export function openAddTask(dayId) {
  state.currentDayId = dayId;
  state.selectedSubject = null;
  document.querySelectorAll('.subj-chip').forEach(c => c.classList.remove('active'));
  document.getElementById('inputTaskTopic').value = '';
  document.getElementById('inputTaskMins').value  = '';
  openSheet('sheetAddTask');
}

export function selectSubject(btn) {
  document.querySelectorAll('.subj-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  state.selectedSubject = btn.dataset.subj;
}

let _savingTask = false;

export async function saveTask() {
  if (_savingTask) return;
  if (!state.currentDayId) { toast('No day selected','error'); return; }
  const subj  = state.selectedSubject;
  const topic = document.getElementById('inputTaskTopic').value.trim();
  const mins  = parseInt(document.getElementById('inputTaskMins').value) || 0;

  if (!subj)  { toast('Pick a subject', 'error'); return; }
  if (!topic) { toast('Enter a topic', 'error');  return; }

  _savingTask = true;

  const task = {
    id: uid(), day_id: state.currentDayId,
    subject: subj, topic, sub_topic: null, estimated_minutes: mins,
    status: 'pending', created_at: new Date().toISOString()
  };

  state.tasks.push(task);
  DB.save();
  await FireDB.insertTask(task);
  _savingTask = false;
  closeSheet();
  renderPlan();
  renderHome();
  toast('Task added', 'success');
}

export async function toggleTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'completed' ? 'pending' : 'completed';
  if (task.status === 'completed' && navigator.vibrate) navigator.vibrate(30);
  DB.save();
  await FireDB.updateTask(taskId, { status: task.status });
  renderPlan();
  renderHome();
  renderBacklog();
}

export async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;

  state.tasks = state.tasks.filter(t => t.id !== taskId);
  DB.save();
  await FireDB.deleteTask(taskId);
  renderPlan();
  renderHome();
  renderBacklog();
  toast('Task removed');
}

export async function toggleEditTask(taskId) {
  const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskItem) return;

  const topicEl = taskItem.querySelector('[data-field="topic"]');
  const minsEl  = taskItem.querySelector('[data-field="minutes"]');
  const editBtn = taskItem.querySelector('.task-edit-btn');

  const isEditing = topicEl.getAttribute('contenteditable') === 'true';

  if (isEditing) {
    const newTopic = topicEl.textContent.trim();
    const minsText = minsEl.textContent.trim();

    let newMins = 0;
    const hMatch = minsText.match(/(\d+)h/);
    const mMatch = minsText.match(/(\d+)m/);
    if (hMatch) newMins += parseInt(hMatch[1]) * 60;
    if (mMatch) newMins += parseInt(mMatch[1]);
    if (!hMatch && !mMatch) {
      const plain = parseInt(minsText.trim(), 10);
      if (!isNaN(plain) && plain > 0) newMins = plain;
    }

    if (!newTopic || newMins <= 0) {
      toast('Invalid task data', 'error');
      return;
    }

    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      task.topic = newTopic;
      task.estimated_minutes = newMins;
      DB.save();
      await FireDB.updateTask(taskId, { topic: newTopic, estimated_minutes: newMins });
      toast('Task updated', 'success');
    }

    topicEl.setAttribute('contenteditable', 'false');
    minsEl.setAttribute('contenteditable', 'false');
    editBtn.classList.remove('editing');

    renderPlan();
    renderHome();
    renderBacklog();
  } else {
    topicEl.setAttribute('contenteditable', 'true');
    minsEl.setAttribute('contenteditable', 'true');
    editBtn.classList.add('editing');
    topicEl.focus();

    minsEl.addEventListener('focus', () => {
      const range = document.createRange();
      range.selectNodeContents(minsEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, { once: true });
  }
}

// ─── Day Management ────────────────────────────────────────────────────

let _savingDay = false;

export async function saveDay() {
  if (_savingDay) return;
  const label = document.getElementById('inputDayLabel').value.trim();
  const date  = document.getElementById('inputDayDate').value;
  if (!label) { toast('Enter a label', 'error'); return; }

  _savingDay = true;
  const day = { id: uid(), label, date: date || null, created_at: new Date().toISOString() };
  state.days.push(day);
  DB.save();
  await FireDB.insertDay(day);
  _savingDay = false;
  closeSheet();
  renderPlan();
  renderHome();
  toast('Day added', 'success');
}

export async function toggleEditDay(dayId) {
  const labelEl = document.querySelector(`[data-day-id="${dayId}"][data-field="label"]`);
  if (!labelEl) return;

  const isEditing = labelEl.getAttribute('contenteditable') === 'true';

  if (isEditing) {
    const newLabel = labelEl.textContent.trim();
    if (!newLabel) {
      toast('Day label cannot be empty', 'error');
      return;
    }

    const day = state.days.find(d => d.id === dayId);
    if (day) {
      day.label = newLabel;
      DB.save();
      await FireDB.updateDay(dayId, { label: newLabel });
      toast('Day label updated', 'success');
    }

    labelEl.setAttribute('contenteditable', 'false');
    renderPlan();
    renderHome();
  } else {
    const badgeEl = labelEl.querySelector('.badge');
    if (badgeEl) badgeEl.remove();

    labelEl.setAttribute('contenteditable', 'true');
    labelEl.focus();

    const range = document.createRange();
    range.selectNodeContents(labelEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export async function deleteDay(dayId) {
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;

  const tasksToDelete = state.tasks.filter(t => t.day_id === dayId);
  const tasksCount = tasksToDelete.length;

  if (!confirm(`Delete "${day.label}" and ${tasksCount} task(s)?`)) return;

  state.tasks = state.tasks.filter(t => t.day_id !== dayId);
  state.days = state.days.filter(d => d.id !== dayId);

  DB.save();
  await Promise.all(tasksToDelete.map(t => FireDB.deleteTask(t.id)));
  await FireDB.deleteDay(dayId);

  renderPlan();
  renderHome();
  renderBacklog();
  toast('Day deleted', 'success');
}

// ─── Plan Search ───────────────────────────────────────────────────────

export const handlePlanSearch = debounce(function(value) {
  appLocals.planSearchQuery = value;
  renderPlan();
}, SEARCH_DEBOUNCE_MS);

// ─── CSV Import ────────────────────────────────────────────────────────

function setCsvStep(stepNum) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('csvStep' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < stepNum) el.classList.add('done');
    else if (i === stepNum) el.classList.add('active');
  }
}

// ─── CSV Import Helpers ────────────────────────────────────────────────

function resolveSubTopic(row) {
  // Headers already normalized by transformHeader: hyphens/spaces → underscores
  // So "sub-topic" → "sub_topic", "subtopic" stays "subtopic", etc.
  const raw = row.sub_topic || row.subtopic || row.subnote || row.sub_note || '';
  const val = typeof raw === 'string' ? raw.trim() : '';
  return val || null;
}

function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  // Iteratively strip HTML tags to prevent XSS; esc() handles encoding at render time
  let result = val;
  let prev;
  do {
    prev = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== prev);
  return result.trim();
}

export async function handleCSVImport(file) {
  if (!file || !file.name.toLowerCase().endsWith('.csv')) {
    toast('Please select a valid CSV file', 'error');
    return;
  }

  if (typeof Papa === 'undefined') {
    toast('CSV parser not loaded — check your internet connection', 'error');
    return;
  }

  const proc = document.getElementById('csvProcessing');
  proc.classList.add('active');
  document.getElementById('csvStatus').textContent = 'Reading file…';
  setCsvStep(1);

  try {
    const text = await file.text();
    document.getElementById('csvStatus').textContent = 'Parsing data…';
    setCsvStep(2);

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/[\s-]+/g, '_')
    });

    if (parsed.errors.length > 0) {
      proc.classList.remove('active');
      toast('CSV parsing error — check file format', 'error');
      return;
    }

    const allRows = parsed.data;
    if (allRows.length === 0) {
      proc.classList.remove('active');
      toast('CSV file is empty', 'error');
      return;
    }

    const requiredCols = ['day', 'subject', 'topic', 'estimated_minutes'];
    const firstRow = allRows[0];
    const missing = requiredCols.filter(col => !(col in firstRow));

    if (missing.length > 0) {
      proc.classList.remove('active');
      toast(`Missing columns: ${missing.join(', ')}`, 'error');
      return;
    }

    document.getElementById('csvStatus').textContent = 'Validating rows…';
    setCsvStep(3);

    const validRows = [];
    let skippedCount = 0;

    allRows.forEach((row, idx) => {
      if (!row.day || !row.subject || !row.topic) {
        console.warn(`[CSV] Row ${idx + 2}: Missing required field — skipped`);
        skippedCount++;
        return;
      }
      const mins = parseInt(row.estimated_minutes);
      if (isNaN(mins) || mins <= 0) {
        console.warn(`[CSV] Row ${idx + 2}: Invalid estimated_minutes — skipped`);
        skippedCount++;
        return;
      }
      validRows.push(row);
    });

    if (validRows.length === 0) {
      proc.classList.remove('active');
      toast(`All ${allRows.length} rows invalid — check CSV format`, 'error');
      return;
    }

    if (skippedCount > 0) {
      console.warn(`[CSV] ${skippedCount} malformed rows skipped, ${validRows.length} valid`);
    }

    document.getElementById('csvStatus').textContent = 'Preparing preview…';
    setCsvStep(4);

    const dayGroups = {};
    validRows.forEach(row => {
      const dayKey = row.day.trim();
      if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
      dayGroups[dayKey].push(row);
    });

    appLocals.csvParsedData = dayGroups;
    appLocals.csvSkippedCount = skippedCount;
    appLocals.csvTotalRows = allRows.length;
    proc.classList.remove('active');
    showCSVSelectionUI(dayGroups);

  } catch (err) {
    console.error('CSV import error:', err);
    proc.classList.remove('active');
    toast('Import failed — check file format', 'error');
  }
}

function showCSVSelectionUI(dayGroups) {
  const dayKeys = Object.keys(dayGroups);
  const baseDate = new Date();

  appLocals.csvSelection = {};
  dayKeys.forEach((dayKey, i) => {
    const localDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, '0');
    const d = String(localDate.getDate()).padStart(2, '0');
    appLocals.csvSelection[dayKey] = {
      selected: true,
      tasks: dayGroups[dayKey].map(() => true),
      date: `${y}-${m}-${d}`
    };
  });

  renderCSVSelectionList(dayGroups);
  openSheet('sheetCSVImport');
}

export function updateCSVDayDate(dayIdx, value) {
  const dayKeys = Object.keys(appLocals.csvParsedData || {});
  const dayKey = dayKeys[dayIdx];
  if (dayKey && appLocals.csvSelection[dayKey]) {
    appLocals.csvSelection[dayKey].date = value;
  }
}

export function toggleCSVDay(dayIdx) {
  const dayKeys = Object.keys(appLocals.csvParsedData || {});
  const dayKey = dayKeys[dayIdx];
  if (!dayKey || !appLocals.csvSelection[dayKey]) return;

  const sel = appLocals.csvSelection[dayKey];
  sel.selected = !sel.selected;
  sel.tasks = sel.tasks.map(() => sel.selected);
  renderCSVSelectionList(appLocals.csvParsedData);
}

export function toggleCSVTask(dayIdx, taskIdx) {
  const dayKeys = Object.keys(appLocals.csvParsedData || {});
  const dayKey = dayKeys[dayIdx];
  if (!dayKey || !appLocals.csvSelection[dayKey]) return;

  const sel = appLocals.csvSelection[dayKey];
  sel.tasks[taskIdx] = !sel.tasks[taskIdx];
  sel.selected = sel.tasks.some(t => t);
  renderCSVSelectionList(appLocals.csvParsedData);
}

export async function confirmCSVImport() {
  if (!appLocals.csvParsedData) return;

  const proc = document.getElementById('csvProcessing');
  proc.classList.add('active');
  document.getElementById('csvStatus').textContent = 'Importing study plan…';
  setCsvStep(1);

  const dayKeys = Object.keys(appLocals.csvParsedData);
  let addedDays = 0, addedTasks = 0, duplicateCount = 0;
  const totalDays = dayKeys.filter(k => appLocals.csvSelection[k] && appLocals.csvSelection[k].selected).length;

  // Build existing task uniqueness set: day_id + subject + topic + sub_topic
  const existingKeys = new Set();
  state.tasks.forEach(t => {
    const day = state.days.find(d => d.id === t.day_id);
    if (day) {
      const key = `${day.label}|${t.subject}|${t.topic}|${t.sub_topic || ''}`;
      existingKeys.add(key.toLowerCase());
    }
  });

  // Track keys added during this import to detect intra-import duplicates
  const importKeys = new Set();

  for (const dayKey of dayKeys) {
    const sel = appLocals.csvSelection[dayKey];
    if (!sel || !sel.selected) continue;

    const dateStr = sel.date || todayStr();

    const dayTasks = appLocals.csvParsedData[dayKey];
    const selectedTasks = [];

    dayTasks.forEach((row, idx) => {
      if (sel.tasks[idx]) {
        selectedTasks.push(row);
      }
    });

    if (selectedTasks.length === 0) continue;

    const day = {
      id: uid(),
      label: dayKey,
      date: dateStr,
      created_at: new Date().toISOString()
    };

    state.days.push(day);
    await FireDB.insertDay(day);
    addedDays++;

    const stepNum = totalDays > 0 ? Math.min(4, Math.ceil((addedDays / totalDays) * 3) + 1) : 1;
    setCsvStep(stepNum);
    document.getElementById('csvStatus').textContent = `Adding day ${addedDays} of ${totalDays}…`;

    for (const row of selectedTasks) {
      const subject = sanitizeString(row.subject);
      const topic = sanitizeString(row.topic);
      const sub_topic = resolveSubTopic(row);
      const sanitizedSubTopic = sub_topic ? sanitizeString(sub_topic) : null;

      // Duplicate detection: day + subject + topic + sub_topic
      const uniqueKey = `${dayKey}|${subject}|${topic}|${sanitizedSubTopic || ''}`.toLowerCase();
      if (existingKeys.has(uniqueKey) || importKeys.has(uniqueKey)) {
        duplicateCount++;
        continue;
      }
      importKeys.add(uniqueKey);

      const task = {
        id: uid(),
        day_id: day.id,
        subject,
        topic,
        sub_topic: sanitizedSubTopic,
        estimated_minutes: parseInt(row.estimated_minutes) || 0,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      state.tasks.push(task);
      await FireDB.insertTask(task);
      addedTasks++;
    }
  }

  DB.save();

  const skipped = appLocals.csvSkippedCount || 0;
  appLocals.csvParsedData = null;
  appLocals.csvSelection = {};
  appLocals.csvSkippedCount = 0;
  appLocals.csvTotalRows = 0;
  proc.classList.remove('active');
  closeSheet();
  renderPlan();
  renderHome();

  let summary = `Imported ${addedDays} days, ${addedTasks} tasks`;
  if (duplicateCount > 0) summary += `, ${duplicateCount} duplicates skipped`;
  if (skipped > 0) summary += `, ${skipped} malformed rows skipped`;
  toast(summary, 'success');
}
