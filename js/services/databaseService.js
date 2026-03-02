// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Database Service (Supabase)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { DB } from './storageService.js';

export const Supa = {
  client: null,

  async init(url, key) {
    if (!url || !key) return { success: false, error: 'Missing credentials' };
    try {
      const { createClient } = await import(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm`);
      Supa.client = createClient(url, key);
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  _mergeById(local, remote) {
    const localMap = new Map(local.map(item => [item.id, item]));
    const merged = [...local];
    const remoteOnly = [];
    for (const item of remote) {
      if (!localMap.has(item.id)) {
        merged.push(item);
        remoteOnly.push(item);
      }
    }
    return { merged, remoteOnly };
  },

  async _pushLocalOnly(table, local, remote) {
    if (!Supa.client) return;
    const remoteIds = new Set(remote.map(item => item.id));
    for (const item of local) {
      if (!remoteIds.has(item.id)) {
        try {
          await Supa.client.from(table).upsert(item, { onConflict: 'id' });
        } catch(e) { console.warn('[Supa] push failed:', table, item.id, e.message); }
      }
    }
  },

  async syncDays() {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('study_days')
        .select('*')
        .order('created_at');

      if (error) throw error;

      const remote = data || [];
      const { merged } = Supa._mergeById(state.days, remote);
      state.days = merged;
      DB.save();
      await Supa._pushLocalOnly('study_days', state.days, remote);
      return { success: true, data: merged, count: merged.length };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async syncTasks() {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('study_tasks')
        .select('*')
        .order('created_at');

      if (error) throw error;

      const remote = data || [];
      const { merged } = Supa._mergeById(state.tasks, remote);
      state.tasks = merged;
      DB.save();
      await Supa._pushLocalOnly('study_tasks', state.tasks, remote);
      return { success: true, data: merged, count: merged.length };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async syncSessions() {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('focus_sessions')
        .select('*')
        .order('created_at');

      if (error) throw error;

      const remote = data || [];
      const { merged } = Supa._mergeById(state.sessions, remote);
      state.sessions = merged;
      DB.save();
      await Supa._pushLocalOnly('focus_sessions', state.sessions, remote);
      return { success: true, data: merged, count: merged.length };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async syncPersonalTasks() {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('personal_tasks')
        .select('*')
        .order('created_at');

      if (error) throw error;

      const remote = data || [];
      const { merged } = Supa._mergeById(state.personalTasks, remote);
      state.personalTasks = merged;
      DB.save();
      await Supa._pushLocalOnly('personal_tasks', state.personalTasks, remote);
      return { success: true, data: merged, count: merged.length };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async syncQuestionAnalytics() {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('question_analytics')
        .select('*')
        .order('created_at');

      if (error) throw error;

      const remote = data || [];
      const { merged } = Supa._mergeById(state.questionAnalytics, remote);
      state.questionAnalytics = merged;
      DB.save();
      await Supa._pushLocalOnly('question_analytics', state.questionAnalytics, remote);
      return { success: true, data: merged, count: merged.length };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async insertDay(day) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('study_days')
        .insert(day)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async insertTask(task) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('study_tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async updateTask(id, updates) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('study_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async updateDay(id, updates) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('study_days')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async deleteTask(id) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { error } = await Supa.client
        .from('study_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async deleteDay(id) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { error } = await Supa.client
        .from('study_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async insertSession(s) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('focus_sessions')
        .insert(s)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async insertPersonalTask(task) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('personal_tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async updatePersonalTask(id, updates) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { data, error } = await Supa.client
        .from('personal_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async deletePersonalTask(id) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const { error } = await Supa.client
        .from('personal_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async savePushSubscription(subscription) {
    if (!Supa.client) return { success: false, error: 'Not connected' };
    try {
      const subJson = subscription.toJSON();
      const { endpoint, keys } = subJson;

      const { data, error } = await Supa.client
        .from('push_subscriptions')
        .upsert({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_id: 'anonymous',
        }, {
          onConflict: 'endpoint'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },
};
