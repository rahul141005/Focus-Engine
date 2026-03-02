// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Database Service (Firebase Firestore)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { DB } from './storageService.js';
import { Firebase } from './firebaseService.js';

export const Supa = {
  async init() {
    return await Firebase.init();
  },

  async syncDays() {
    const result = await Firebase.getAll('days');
    if (!result.success) return result;

    const remote = result.data || [];
    const localIds = new Set(state.days.map(d => d.id));
    for (const item of remote) {
      if (!localIds.has(item.id)) state.days.push(item);
    }
    DB.save();
    const remoteIds = new Set(remote.map(d => d.id));
    for (const item of state.days) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('days', item.id, item);
      }
    }
    return { success: true, data: state.days, count: state.days.length };
  },

  async syncTasks() {
    const result = await Firebase.getAll('tasks');
    if (!result.success) return result;

    const remote = result.data || [];
    const localIds = new Set(state.tasks.map(t => t.id));
    for (const item of remote) {
      if (!localIds.has(item.id)) state.tasks.push(item);
    }
    DB.save();
    const remoteIds = new Set(remote.map(t => t.id));
    for (const item of state.tasks) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('tasks', item.id, item);
      }
    }
    return { success: true, data: state.tasks, count: state.tasks.length };
  },

  async syncSessions() {
    const result = await Firebase.getAll('sessions');
    if (!result.success) return result;

    const remote = result.data || [];
    const localIds = new Set(state.sessions.map(s => s.id));
    for (const item of remote) {
      if (!localIds.has(item.id)) state.sessions.push(item);
    }
    DB.save();
    const remoteIds = new Set(remote.map(s => s.id));
    for (const item of state.sessions) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('sessions', item.id, item);
      }
    }
    return { success: true, data: state.sessions, count: state.sessions.length };
  },

  async syncPersonalTasks() {
    const result = await Firebase.getAll('personalTasks');
    if (!result.success) return result;

    const remote = result.data || [];
    const localIds = new Set(state.personalTasks.map(t => t.id));
    for (const item of remote) {
      if (!localIds.has(item.id)) state.personalTasks.push(item);
    }
    DB.save();
    const remoteIds = new Set(remote.map(t => t.id));
    for (const item of state.personalTasks) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('personalTasks', item.id, item);
      }
    }
    return { success: true, data: state.personalTasks, count: state.personalTasks.length };
  },

  async syncQuestionAnalytics() {
    const result = await Firebase.getAll('questionAnalytics');
    if (!result.success) return result;

    const remote = result.data || [];
    const localIds = new Set(state.questionAnalytics.map(q => q.id));
    for (const item of remote) {
      if (!localIds.has(item.id)) state.questionAnalytics.push(item);
    }
    DB.save();
    const remoteIds = new Set(remote.map(q => q.id));
    for (const item of state.questionAnalytics) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('questionAnalytics', item.id, item);
      }
    }
    return { success: true, data: state.questionAnalytics, count: state.questionAnalytics.length };
  },

  async insertDay(day) {
    return await Firebase.setDoc('days', day.id, day);
  },

  async insertTask(task) {
    return await Firebase.setDoc('tasks', task.id, task);
  },

  async updateTask(id, updates) {
    return await Firebase.updateDoc('tasks', id, updates);
  },

  async updateDay(id, updates) {
    return await Firebase.updateDoc('days', id, updates);
  },

  async deleteTask(id) {
    return await Firebase.deleteDoc('tasks', id);
  },

  async deleteDay(id) {
    return await Firebase.deleteDoc('days', id);
  },

  async insertSession(s) {
    return await Firebase.setDoc('sessions', s.id, s);
  },

  async insertPersonalTask(task) {
    return await Firebase.setDoc('personalTasks', task.id, task);
  },

  async updatePersonalTask(id, updates) {
    return await Firebase.updateDoc('personalTasks', id, updates);
  },

  async deletePersonalTask(id) {
    return await Firebase.deleteDoc('personalTasks', id);
  },

  async savePushToken(token) {
    return await Firebase.setDoc('pushTokens', 'device', {
      token,
      updated_at: new Date().toISOString(),
    });
  },
};
