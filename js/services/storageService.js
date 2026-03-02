// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Storage Service (LocalStorage)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';

export const DB = {
  save() {
    try {
      localStorage.setItem('fe_state', JSON.stringify({
        days: state.days || [],
        tasks: state.tasks || [],
        sessions: state.sessions || [],
        personalTasks: state.personalTasks || [],
        questionAnalytics: state.questionAnalytics || [],
        sessionNotes: state.sessionNotes || [],
        questionNotes: state.questionNotes || [],
        rescheduledTopics: state.rescheduledTopics || [],
        settings: state.settings,
        pushSubscription: state.pushSubscription,
      }));
    } catch(e) {
      console.error('[DB] save failed:', e);
    }
  },
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('fe_state') || '{}');
      if (Array.isArray(saved.days))              state.days = saved.days;
      if (Array.isArray(saved.tasks))             state.tasks = saved.tasks;
      if (Array.isArray(saved.sessions))          state.sessions = saved.sessions;
      if (Array.isArray(saved.personalTasks))     state.personalTasks = saved.personalTasks;
      if (Array.isArray(saved.questionAnalytics)) state.questionAnalytics = saved.questionAnalytics;
      if (Array.isArray(saved.sessionNotes))      state.sessionNotes = saved.sessionNotes;
      if (Array.isArray(saved.questionNotes))     state.questionNotes = saved.questionNotes;
      if (Array.isArray(saved.rescheduledTopics)) state.rescheduledTopics = saved.rescheduledTopics;
      if (saved.settings && typeof saved.settings === 'object') {
        state.settings = Object.assign({}, state.settings, saved.settings);
        // Ensure nested notifications object is not overwritten with undefined
        if (saved.settings.notifications && typeof saved.settings.notifications === 'object') {
          state.settings.notifications = Object.assign(
            {},
            { study: false, brainFog: false, evening: false, personal: false },
            saved.settings.notifications
          );
        }
      }
      if (saved.pushSubscription) state.pushSubscription = saved.pushSubscription;
    } catch(e) {
      console.warn('[DB] load failed:', e);
    }
  }
};
