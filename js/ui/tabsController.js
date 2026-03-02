// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Tabs Controller
// ═══════════════════════════════════════════════════════════════════════

import { renderHome, renderPlan, renderBacklog, renderSettings } from './renderEngine.js';
import { renderProgress } from '../features/progressFeature.js';
import { renderPersonal } from '../features/notesFeature.js';

export function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if (btn) btn.classList.add('active');

  if (name === 'home')     renderHome();
  if (name === 'plan')     renderPlan();
  if (name === 'backlog')  renderBacklog();
  if (name === 'progress') renderProgress();
  if (name === 'personal') renderPersonal();
  if (name === 'settings') renderSettings();

  document.getElementById('tabContent').scrollTop = 0;
}
