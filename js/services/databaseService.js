// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Database Service (Firebase Firestore)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { DB } from './storageService.js';
import { Firebase } from './firebaseService.js';

export const FireDB = {
  async init() {
    return await Firebase.init();
  },

  // Normalize legacy subNote → sub_topic for backward compatibility
  _normalizeSubTopic(item) {
    if (item.sub_topic === undefined) {
      item.sub_topic = item.subNote || null;
    }
    return item;
  },

  // Ensure document has required fields before saving
  _ensureFields(doc) {
    if (!doc.created_at) {
      doc.created_at = new Date().toISOString();
    }
    // Only normalize sub_topic for document types that use it
    // (tasks, sessions, questionAnalytics, sessionNotes — NOT days or personalTasks)
    if ('sub_topic' in doc || 'subNote' in doc) {
      if (doc.sub_topic === undefined) {
        doc.sub_topic = doc.subNote || null;
      }
      // Remove legacy subNote field from new writes
      delete doc.subNote;
    }
    return doc;
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
      FireDB._normalizeSubTopic(item);
      if (!localIds.has(item.id)) state.tasks.push(item);
    }
    // Normalize existing local tasks
    state.tasks.forEach(t => FireDB._normalizeSubTopic(t));
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
      FireDB._normalizeSubTopic(item);
      if (!localIds.has(item.id)) state.sessions.push(item);
    }
    // Normalize existing local sessions
    state.sessions.forEach(s => FireDB._normalizeSubTopic(s));
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
      FireDB._normalizeSubTopic(item);
      if (!localIds.has(item.id)) state.questionAnalytics.push(item);
    }
    state.questionAnalytics.forEach(q => FireDB._normalizeSubTopic(q));
    DB.save();
    const remoteIds = new Set(remote.map(q => q.id));
    for (const item of state.questionAnalytics) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('questionAnalytics', item.id, item);
      }
    }
    return { success: true, data: state.questionAnalytics, count: state.questionAnalytics.length };
  },

  async syncSessionNotes() {
    const result = await Firebase.getAll('sessionNotes');
    if (!result.success) return result;

    const remote = result.data || [];
    const localIds = new Set(state.sessionNotes.map(n => n.id));
    for (const item of remote) {
      FireDB._normalizeSubTopic(item);
      if (!localIds.has(item.id)) state.sessionNotes.push(item);
    }
    // Normalize existing local session notes
    state.sessionNotes.forEach(n => FireDB._normalizeSubTopic(n));
    DB.save();
    const remoteIds = new Set(remote.map(n => n.id));
    for (const item of state.sessionNotes) {
      if (!remoteIds.has(item.id)) {
        await Firebase.setDoc('sessionNotes', item.id, item);
      }
    }
    return { success: true, data: state.sessionNotes, count: state.sessionNotes.length };
  },

  async insertDay(day) {
    return await Firebase.setDoc('days', day.id, FireDB._ensureFields(day));
  },

  async insertTask(task) {
    return await Firebase.setDoc('tasks', task.id, FireDB._ensureFields(task));
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
    return await Firebase.setDoc('sessions', s.id, FireDB._ensureFields(s));
  },

  async insertPersonalTask(task) {
    return await Firebase.setDoc('personalTasks', task.id, FireDB._ensureFields(task));
  },

  async updatePersonalTask(id, updates) {
    return await Firebase.updateDoc('personalTasks', id, updates);
  },

  async deletePersonalTask(id) {
    return await Firebase.deleteDoc('personalTasks', id);
  },

  async insertQuestionAnalytics(record) {
    return await Firebase.setDoc('questionAnalytics', record.id, FireDB._ensureFields(record));
  },

  async savePushToken(token) {
    return await Firebase.setDoc('pushTokens', 'device', {
      token,
      updated_at: new Date().toISOString(),
    });
  },
};
