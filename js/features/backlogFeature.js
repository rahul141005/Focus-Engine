// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Backlog Feature
// ═══════════════════════════════════════════════════════════════════════

import { state, appLocals } from '../core/appState.js';
import { uid, todayStr } from '../utils/timeUtils.js';
import { esc } from '../utils/formatUtils.js';
import { DB } from '../services/storageService.js';
import { Supa } from '../services/databaseService.js';
import { toast } from '../ui/toastController.js';
import { openSheet, closeSheet } from '../ui/modalController.js';
import { renderBacklog, renderHome, renderPlan } from '../ui/renderEngine.js';

export function setBacklogSort(value) {
  appLocals.backlogSortBy = value;
  renderBacklog();
}

export function openReassign(taskId) {
  state.reassignTaskId = taskId;
  const container = document.getElementById('reassignDayList');
  container.innerHTML = state.days.map(day => {
    return `<div class="session-pick-item" onclick="App.reassignTask('${day.id}')">
      <div class="pick-info">
        <div class="pick-subj">${esc(day.label)}</div>
        <div style="font-size:12px;color:var(--text-3)">${day.date || 'No date'}</div>
      </div>
    </div>`;
  }).join('') || '<div style="padding:16px;color:var(--text-3);font-size:13px">No days available</div>';
  openSheet('sheetReassign');
}

export async function reassignTask(dayId) {
  const task = state.tasks.find(t => t.id === state.reassignTaskId);
  if (task) {
    const originalDayId = task.day_id;
    state.rescheduledTopics.push({
      id: uid(),
      taskId: task.id,
      originalDayId: originalDayId,
      newDayId: dayId,
      date: todayStr(),
    });
    task.day_id = dayId;
    DB.save();
    await Supa.updateTask(task.id, { day_id: dayId });
  }
  closeSheet();
  renderBacklog();
  renderHome();
  toast('Task moved', 'success');
}

export async function undoReschedule(rescheduleId) {
  const entry = state.rescheduledTopics.find(r => r.id === rescheduleId);
  if (!entry) return;
  const task = state.tasks.find(t => t.id === entry.taskId);
  if (task) {
    task.day_id = entry.originalDayId;
    await Supa.updateTask(task.id, { day_id: entry.originalDayId });
  }
  state.rescheduledTopics = state.rescheduledTopics.filter(r => r.id !== rescheduleId);
  DB.save();
  renderBacklog();
  renderPlan();
  renderHome();
  toast('Undo successful', 'success');
}
