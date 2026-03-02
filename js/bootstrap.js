// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Bootstrap
//  Initialization, event bindings, and public API assembly
// ═══════════════════════════════════════════════════════════════════════

import { state, session, appLocals } from './core/appState.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config/routes.js';
import { QUOTES } from './config/constants.js';
import { todayStr } from './utils/timeUtils.js';
import { DB } from './services/storageService.js';
import { Supa } from './services/databaseService.js';
import { subscribeToPushNotifications } from './services/analyticsService.js';
import { toast } from './ui/toastController.js';
import { openSheet, closeSheet } from './ui/modalController.js';
import {
  renderHome, renderPlan, renderBacklog, renderSettings,
  toggleDayCard, toggleSubjectAnalytics, showSupabaseStatus,
  renderCSVSelectionList,
} from './ui/renderEngine.js';
import { renderProgress } from './features/progressFeature.js';
import { renderPersonal, addPersonalTask, togglePersonalTask, deletePersonalTask } from './features/notesFeature.js';
import { switchTab } from './ui/tabsController.js';
import { closeSummary } from './ui/sessionView.js';
import { startClock, updateClock } from './core/timerEngine.js';
import {
  startSessionFlow, startSession, startSessionWithMode,
  pauseSession, endSession, switchSessionMode,
} from './core/sessionEngine.js';
import { nextQuestion, skipQuestion, prevQuestion } from './core/questionEngine.js';
import {
  openAddTask, selectSubject, saveTask, toggleTask, deleteTask,
  toggleEditTask, saveDay, toggleEditDay, deleteDay,
  handlePlanSearch, handleCSVImport,
  toggleCSVDay, toggleCSVTask, updateCSVDayDate, confirmCSVImport,
} from './features/planFeature.js';
import {
  setBacklogSort, openReassign, reassignTask, undoReschedule,
} from './features/backlogFeature.js';

// ─── Motivational Quote Engine ─────────────────────────────────────────

function loadRandomQuote() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('quoteText').textContent = quote;
}

// ─── Settings Handlers ─────────────────────────────────────────────────

function toggleSetting(el) {
  el.classList.toggle('on');
  const id = el.id;
  const on = el.classList.contains('on');

  if (id === 'toggleStudyNotif')    state.settings.notifications.study = on;
  if (id === 'toggleBrainFog')      state.settings.notifications.brainFog = on;
  if (id === 'toggleEvening')       state.settings.notifications.evening = on;
  if (id === 'togglePersonalNotif') state.settings.notifications.personal = on;
  if (id === 'toggleSound')         state.settings.sound = on;

  DB.save();

  if (on && id !== 'toggleSound') {
    subscribeToPushNotifications();
  }
}

function setTheme(theme, btn) {
  state.settings.theme = theme;
  document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.documentElement.dataset.theme = theme;
  DB.save();
}

async function saveSupabaseConfig() {
  showSupabaseStatus('Connecting...', 'info');

  const initResult = await Supa.init(SUPABASE_URL, SUPABASE_KEY);

  if (!initResult.success) {
    showSupabaseStatus(`Connection failed: ${initResult.error}`, 'error');
    return;
  }

  showSupabaseStatus('Connected! Syncing data...', 'info');

  const [daysResult, tasksResult, sessionsResult, personalResult, analyticsResult] = await Promise.all([
    Supa.syncDays(),
    Supa.syncTasks(),
    Supa.syncSessions(),
    Supa.syncPersonalTasks(),
    Supa.syncQuestionAnalytics(),
  ]);

  const totalSynced =
    (daysResult.count || 0) +
    (tasksResult.count || 0) +
    (sessionsResult.count || 0) +
    (personalResult.count || 0) +
    (analyticsResult.count || 0);

  if (totalSynced === 0) {
    showSupabaseStatus('Already Synced', 'info');
  } else {
    showSupabaseStatus(`Sync Successful — ${totalSynced} items synced`, 'success');
  }

  renderHome();
  renderPlan();
  renderProgress();
  renderPersonal();
}

function handleInstall() {
  if (appLocals.deferredInstallPrompt) {
    appLocals.deferredInstallPrompt.prompt();
    appLocals.deferredInstallPrompt.userChoice.then(c => {
      if (c.outcome === 'accepted') toast('App installed!', 'success');
      appLocals.deferredInstallPrompt = null;
    });
  } else {
    toast('Open in Chrome and use "Add to Home Screen" from the menu', '');
  }
}

function clearData() {
  if (!confirm('Clear all local data? This cannot be undone.')) return;
  state.days = [];
  state.tasks = [];
  state.sessions = [];
  state.personalTasks = [];
  state.questionAnalytics = [];
  state.sessionNotes = [];
  state.questionNotes = [];
  state.rescheduledTopics = [];
  DB.save();
  renderHome();
  renderPlan();
  renderBacklog();
  renderProgress();
  renderPersonal();
  toast('Data cleared');
}

// ─── Supabase Auto-Init ────────────────────────────────────────────────

async function trySupabaseInit() {
  const result = await Supa.init(SUPABASE_URL, SUPABASE_KEY);
  if (result.success) {
    showSupabaseStatus('Connected to Supabase', 'success');
    Promise.all([
      Supa.syncDays(),
      Supa.syncTasks(),
      Supa.syncSessions(),
      Supa.syncPersonalTasks(),
      Supa.syncQuestionAnalytics(),
    ]).then(() => {
      renderHome();
      renderPlan();
      renderBacklog();
      renderProgress();
      renderPersonal();
    }).catch(err => {
      console.warn('[Supa] sync render failed:', err);
    });
  } else {
    showSupabaseStatus('Supabase offline — data saved locally', 'info');
  }
}

// ─── Init ──────────────────────────────────────────────────────────────

export function init() {
  DB.load();

  if (state.settings.theme) {
    document.documentElement.dataset.theme = state.settings.theme;
  }

  startClock();
  loadRandomQuote();
  renderHome();
  renderProgress();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('[FE] SW registered'))
      .catch(err => console.warn('[FE] SW error', err));
  }

  // Event bindings
  document.getElementById('btnStartSession').addEventListener('click', startSessionFlow);
  document.getElementById('btnEndSession').addEventListener('click', endSession);
  document.getElementById('btnPauseSession').addEventListener('click', pauseSession);

  document.getElementById('btnAddDay').addEventListener('click', () => {
    document.getElementById('inputDayLabel').value = '';
    document.getElementById('inputDayDate').value = todayStr();
    openSheet('sheetAddDay');
  });

  document.getElementById('btnImportCSV').addEventListener('click', () => {
    document.getElementById('csvFileInput').click();
  });

  document.getElementById('csvFileInput').addEventListener('change', e => {
    if (e.target.files[0]) handleCSVImport(e.target.files[0]);
    e.target.value = '';
  });

  document.getElementById('btnAddPersonal').addEventListener('click', addPersonalTask);
  document.getElementById('personalInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') addPersonalTask();
  });

  document.querySelectorAll('#personalFrequencyChips .personal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#personalFrequencyChips .personal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
  document.querySelectorAll('#personalPriorityChips .personal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#personalPriorityChips .personal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  const btnInstallEl = document.getElementById('btnInstall');
  if (btnInstallEl) btnInstallEl.addEventListener('click', handleInstall);
  document.getElementById('btnClearData').addEventListener('click', clearData);

  ['settingEndTime', 'settingStartTime'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      if (id === 'settingEndTime')   state.settings.dayEndTime   = e.target.value;
      if (id === 'settingStartTime') state.settings.dayStartTime = e.target.value;
      DB.save();
    });
  });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    appLocals.deferredInstallPrompt = e;
  });

  const userNameInput = document.getElementById('settingUserName');
  if (userNameInput) {
    userNameInput.addEventListener('change', e => {
      state.settings.userName = e.target.value.trim();
      DB.save();
      updateClock();
    });
  }

  const csvSelectAll = document.getElementById('csvSelectAll');
  if (csvSelectAll) {
    csvSelectAll.addEventListener('click', () => {
      if (!appLocals.csvParsedData) return;
      Object.keys(appLocals.csvSelection).forEach(key => {
        appLocals.csvSelection[key].selected = true;
        appLocals.csvSelection[key].tasks = appLocals.csvSelection[key].tasks.map(() => true);
      });
      renderCSVSelectionList(appLocals.csvParsedData);
    });
  }
  const csvDeselectAll = document.getElementById('csvDeselectAll');
  if (csvDeselectAll) {
    csvDeselectAll.addEventListener('click', () => {
      if (!appLocals.csvParsedData) return;
      Object.keys(appLocals.csvSelection).forEach(key => {
        appLocals.csvSelection[key].selected = false;
        appLocals.csvSelection[key].tasks = appLocals.csvSelection[key].tasks.map(() => false);
      });
      renderCSVSelectionList(appLocals.csvParsedData);
    });
  }
  const csvConfirm = document.getElementById('csvImportConfirm');
  if (csvConfirm) {
    csvConfirm.addEventListener('click', confirmCSVImport);
  }

  const btnNext = document.getElementById('btnNextQuestion');
  if (btnNext) btnNext.addEventListener('click', nextQuestion);
  const btnSkip = document.getElementById('btnSkipQuestion');
  if (btnSkip) btnSkip.addEventListener('click', skipQuestion);
  const btnPrev = document.getElementById('btnPrevQuestion');
  if (btnPrev) btnPrev.addEventListener('click', prevQuestion);
  const btnSwitch = document.getElementById('btnSwitchMode');
  if (btnSwitch) btnSwitch.addEventListener('click', switchSessionMode);

  const planSearch = document.getElementById('planSearchInput');
  if (planSearch) planSearch.addEventListener('input', e => handlePlanSearch(e.target.value));

  const backlogSort = document.getElementById('backlogSortSelect');
  if (backlogSort) backlogSort.addEventListener('change', e => setBacklogSort(e.target.value));

  history.pushState(null, '', location.href);
  window.addEventListener('popstate', function(e) {
    history.pushState(null, '', location.href);
    if (session.active) {
      toast('End the session before navigating', '');
      return;
    }
    const openSheetEl = document.querySelector('.bottom-sheet.active');
    if (openSheetEl) {
      closeSheet();
      return;
    }
    const activeTab = document.querySelector('.tab-panel.active');
    if (activeTab && activeTab.id !== 'tab-home') {
      const homeBtn = document.querySelector('.nav-item[data-tab="home"]');
      switchTab('home', homeBtn);
    }
  });

  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const summary = document.getElementById('sessionSummaryOverlay');
      if (summary && summary.classList.contains('active')) {
        closeSummary();
        return;
      }
      const openSheetEl = document.querySelector('.bottom-sheet.active');
      if (openSheetEl) {
        closeSheet();
      }
    }
  });

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      DB.save();
    }
  });

  window.addEventListener('pagehide', function() {
    DB.save();
  });

  trySupabaseInit();
}

// ─── Public API (for inline onclick handlers in HTML) ──────────────────

export const AppAPI = {
  init,
  switchTab,
  toggleDayCard,
  openAddTask,
  selectSubject,
  saveTask,
  saveDay,
  toggleTask,
  deleteTask,
  deleteDay,
  toggleEditTask,
  toggleEditDay,
  startSession,
  startSessionWithMode,
  startSessionFlow,
  pauseSession,
  endSession,
  switchSessionMode,
  prevQuestion,
  openReassign,
  reassignTask,
  undoReschedule,
  toggleSetting,
  setTheme,
  saveSupabaseConfig,
  clearData,
  handleInstall,
  closeSheet,
  closeSummary,
  addPersonalTask,
  togglePersonalTask,
  deletePersonalTask,
  toggleCSVDay,
  toggleCSVTask,
  updateCSVDayDate,
  confirmCSVImport,
  nextQuestion,
  skipQuestion,
  toggleSubjectAnalytics,
  handlePlanSearch,
  setBacklogSort,
};
