// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Bootstrap
//  Initialization, event bindings, and public API assembly
// ═══════════════════════════════════════════════════════════════════════

import { state, session, appLocals } from './core/appState.js';
import { QUOTES } from './config/constants.js';
import { todayStr } from './utils/timeUtils.js';
import { DB } from './services/storageService.js';
import { FireDB } from './services/databaseService.js';
import { toast } from './ui/toastController.js';
import { openSheet, closeSheet } from './ui/modalController.js';
import {
  renderHome, renderPlan, renderBacklog, renderSettings,
  toggleDayCard, toggleSubjectAnalytics, showCloudStatus,
  renderCSVSelectionList,
} from './ui/renderEngine.js';
import { renderProgress } from './features/progressFeature.js';
import { renderPersonal, addPersonalTask, togglePersonalTask, deletePersonalTask } from './features/notesFeature.js';
import { toggleNoteExpand, toggleNoteQA, openEditNote, saveEditNote, deleteSessionNote, closeNoteModal } from './features/notesEngine.js';
import { switchTab } from './ui/tabsController.js';
import { closeSummary, showSessionSummary } from './ui/sessionView.js';
import { startClock, updateClock } from './core/timerEngine.js';
import {
  startSessionFlow, startSession, startSessionWithMode,
  pauseSession, endSession, switchSessionMode,
  registerSessionUI,
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
import { subscribeToPushNotifications, registerAnalyticsUI } from './services/analyticsService.js';

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

async function saveFirebaseConfig() {
  showCloudStatus('Connecting...', 'info');

  const initResult = await FireDB.init();

  if (!initResult.success) {
    showCloudStatus(`Connection failed: ${initResult.error}`, 'error');
    return;
  }

  showCloudStatus('Connected! Syncing data...', 'info');

  const [daysResult, tasksResult, sessionsResult, personalResult, analyticsResult, notesResult] = await Promise.all([
    FireDB.syncDays(),
    FireDB.syncTasks(),
    FireDB.syncSessions(),
    FireDB.syncPersonalTasks(),
    FireDB.syncQuestionAnalytics(),
    FireDB.syncSessionNotes(),
  ]);

  const totalSynced =
    (daysResult.count || 0) +
    (tasksResult.count || 0) +
    (sessionsResult.count || 0) +
    (personalResult.count || 0) +
    (analyticsResult.count || 0) +
    (notesResult.count || 0);

  if (totalSynced === 0) {
    showCloudStatus('Already Synced', 'info');
  } else {
    showCloudStatus(`Sync Successful — ${totalSynced} items synced`, 'success');
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

let _dataCleared = false;

async function clearData() {
  if (!confirm('Clear all local data? This cannot be undone.')) return;

  const btn = document.getElementById('btnClearData');
  if (btn) btn.disabled = true;

  _dataCleared = true;

  try {
    // 1. Clear Firestore collections
    try {
      await FireDB.deleteAllCollections();
    } catch (err) {
      console.error('[FE] Firestore clear failed:', err);
    }

    // 2. Clear in-memory state
    state.days = [];
    state.tasks = [];
    state.sessions = [];
    state.personalTasks = [];
    state.questionAnalytics = [];
    state.sessionNotes = [];
    state.questionNotes = [];
    state.rescheduledTopics = [];
    state.pushSubscription = null;

    // 3. Clear localStorage
    localStorage.clear();

    // 4. Clear IndexedDB (Firestore offline persistence cache)
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(db => new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = resolve;
          req.onerror = reject;
          req.onblocked = () => {
            console.warn('[FE] IndexedDB delete blocked for:', db.name);
            resolve();
          };
        }))
      );
    } catch (err) {
      console.warn('[FE] IndexedDB clear failed:', err);
    }

    // 5. Clear Service Worker caches
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch (err) {
      console.warn('[FE] Cache clear failed:', err);
    }

    // 6. Re-render all views
    renderHome();
    renderPlan();
    renderBacklog();
    renderProgress();
    renderPersonal();
    toast('All data cleared successfully', 'success');
  } catch (err) {
    console.error('[FE] Clear data error:', err);
    toast('Error clearing data — please try again', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─── Startup Error Display ─────────────────────────────────────────────

const STARTUP_TIMEOUT_MS = 15000;

function showStartupError(phase, message) {
  console.error(`[BOOT] Startup failed at ${phase}: ${message}`);
  const el = document.getElementById('startupError');
  if (el) {
    el.textContent = `Startup issue at ${phase}: ${message}. Showing local data.`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 8000);
  }
}

// ─── Firebase Auto-Init ────────────────────────────────────────────────

async function tryFirebaseInit() {
  if (_dataCleared) return;

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    console.warn('[BOOT] Firebase init timed out');
    showStartupError('INIT_FIREBASE', 'Connection timed out');
    showCloudStatus('Firebase timeout — showing local data', 'info');
  }, STARTUP_TIMEOUT_MS);

  try {
    const result = await FireDB.init();
    clearTimeout(timeout);
    if (timedOut) return;

    if (result.success) {
      showCloudStatus('Connected to Firebase', 'success');
      if (_dataCleared) return;
      try {
        await Promise.all([
          FireDB.syncDays(),
          FireDB.syncTasks(),
          FireDB.syncSessions(),
          FireDB.syncPersonalTasks(),
          FireDB.syncQuestionAnalytics(),
          FireDB.syncSessionNotes(),
        ]);
        renderHome();
        renderPlan();
        renderBacklog();
        renderProgress();
        renderPersonal();
      } catch (err) {
        console.error('[Firebase] sync failed:', err);
        showCloudStatus('Database sync error — showing last available data', 'error');
        showStartupError('INIT_DB', err.message);
      }
    } else {
      console.warn('[BOOT] Firebase offline:', result.error);
      showCloudStatus('Firebase offline — data saved locally', 'info');
    }
  } catch (err) {
    clearTimeout(timeout);
    if (!timedOut) {
      console.error('[BOOT] Firebase init error:', err);
      showStartupError('INIT_FIREBASE', err.message);
      showCloudStatus('Firebase error — data saved locally', 'error');
    }
  }
}

// ─── Init ──────────────────────────────────────────────────────────────

let _initialized = false;

export function init() {
  if (_initialized) {
    console.warn('[FE] init() already called — skipping');
    return;
  }
  _initialized = true;

  // Wire up UI callbacks for core/services layer (avoids layer violations)
  registerSessionUI({
    toast,
    openSheet,
    closeSheet,
    renderHome,
    renderBacklog,
    renderProgress,
    showSessionSummary,
  });
  registerAnalyticsUI(toast);

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
      .then(reg => {
        // Safe update strategy: notify on new version
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (newSW) {
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                newSW.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
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

  tryFirebaseInit();
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
  saveFirebaseConfig,
  clearData,
  handleInstall,
  closeSheet,
  closeSummary,
  addPersonalTask,
  togglePersonalTask,
  deletePersonalTask,
  toggleNoteExpand,
  toggleNoteQA,
  openEditNote,
  saveEditNote,
  deleteSessionNote,
  closeNoteModal,
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
