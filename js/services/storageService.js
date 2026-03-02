// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Storage Service (LocalStorage)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';

export const DB = {
  save() {
    localStorage.setItem('fe_state', JSON.stringify({
      days: state.days,
      tasks: state.tasks,
      sessions: state.sessions,
      personalTasks: state.personalTasks,
      questionAnalytics: state.questionAnalytics,
      sessionNotes: state.sessionNotes,
      questionNotes: state.questionNotes,
      rescheduledTopics: state.rescheduledTopics,
      settings: state.settings,
      pushSubscription: state.pushSubscription,
    }));
  },
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('fe_state') || '{}');
      if (saved.days) state.days = saved.days;
      if (saved.tasks) state.tasks = saved.tasks;
      if (saved.sessions) state.sessions = saved.sessions;
      if (saved.personalTasks) state.personalTasks = saved.personalTasks;
      if (saved.questionAnalytics) state.questionAnalytics = saved.questionAnalytics;
      if (saved.sessionNotes) state.sessionNotes = saved.sessionNotes;
      if (saved.questionNotes) state.questionNotes = saved.questionNotes;
      if (saved.rescheduledTopics) state.rescheduledTopics = saved.rescheduledTopics;
      if (saved.settings) state.settings = Object.assign(state.settings, saved.settings);
      if (saved.pushSubscription) state.pushSubscription = saved.pushSubscription;
    } catch(e) {
      console.warn('DB load failed', e);
    }
  }
};
