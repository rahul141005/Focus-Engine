// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Firebase Service (Firestore + Cloud Messaging)
// ═══════════════════════════════════════════════════════════════════════

import { FIREBASE_CONFIG } from '../config/routes.js';

let _db = null;
let _messaging = null;
let _firestore = null; // module reference
let _initCalled = false;

export const Firebase = {
  db: null,
  messaging: null,

  // Strip undefined fields from an object to prevent Firestore errors
  _stripUndefined(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = val;
      }
    }
    return clean;
  },

  async init() {
    if (_initCalled && _db) {
      return { success: true };
    }
    try {
      console.log('[BOOT] Firebase init start');
      _initCalled = true;
      if (!FIREBASE_CONFIG) {
        console.error('[Firebase] FIREBASE_CONFIG is not defined');
        return { success: false, error: 'Firebase config is not defined' };
      }
      if (!FIREBASE_CONFIG.projectId) {
        console.error('[Firebase] FIREBASE_CONFIG missing required projectId field');
        return { success: false, error: 'Firebase config missing required projectId field' };
      }
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
      const firestore = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
      _firestore = firestore;

      const app = initializeApp(FIREBASE_CONFIG);
      _db = firestore.getFirestore(app);
      Firebase.db = _db;

      console.log('[BOOT] Firebase init complete');
      return { success: true };
    } catch (err) {
      console.error('[Firebase] init failed:', err);
      return { success: false, error: err.message };
    }
  },

  async initMessaging() {
    try {
      const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js');
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');

      const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
      _messaging = getMessaging(app);
      Firebase.messaging = _messaging;

      return { success: true, getToken, onMessage };
    } catch (err) {
      console.error('[Firebase] messaging init failed:', err);
      return { success: false, error: err.message };
    }
  },

  // ─── Firestore CRUD ──────────────────────────────────────────────────

  async getAll(collectionName) {
    if (!_db || !_firestore) return { success: false, error: 'Not connected' };
    try {
      console.log(`[BOOT] Firestore reading collection: ${collectionName}`);
      const { collection, getDocs, query, orderBy } = _firestore;
      const q = query(collection(_db, collectionName), orderBy('created_at'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data());
      console.log(`[BOOT] Firestore ${collectionName}: ${data.length} docs`);
      return { success: true, data };
    } catch (err) {
      console.error(`[Firebase] getAll ${collectionName}:`, err);
      return { success: false, error: err.message };
    }
  },

  async setDoc(collectionName, id, data) {
    if (!_db || !_firestore) return { success: false, error: 'Not connected' };
    try {
      const { doc, setDoc } = _firestore;
      // Strip undefined fields to prevent Firestore errors
      const cleanData = Firebase._stripUndefined(data);
      await setDoc(doc(_db, collectionName, id), cleanData);
      return { success: true, data: cleanData };
    } catch (err) {
      console.error(`[Firebase] setDoc ${collectionName}/${id}:`, err);
      return { success: false, error: err.message };
    }
  },

  async updateDoc(collectionName, id, updates) {
    if (!_db || !_firestore) return { success: false, error: 'Not connected' };
    try {
      const { doc, setDoc } = _firestore;
      // Use merge:true for partial updates to avoid overwriting entire documents
      const cleanUpdates = Firebase._stripUndefined(updates);
      await setDoc(doc(_db, collectionName, id), cleanUpdates, { merge: true });
      return { success: true, data: cleanUpdates };
    } catch (err) {
      console.error(`[Firebase] updateDoc ${collectionName}/${id}:`, err);
      return { success: false, error: err.message };
    }
  },

  async deleteDoc(collectionName, id) {
    if (!_db || !_firestore) return { success: false, error: 'Not connected' };
    try {
      const { doc, deleteDoc } = _firestore;
      await deleteDoc(doc(_db, collectionName, id));
      return { success: true };
    } catch (err) {
      console.error(`[Firebase] deleteDoc ${collectionName}/${id}:`, err);
      return { success: false, error: err.message };
    }
  },
};
