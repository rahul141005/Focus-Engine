// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Push Service (Firebase Cloud Messaging)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { FCM_VAPID_KEY } from '../config/routes.js';
import { DB } from '../services/storageService.js';
import { Supa } from '../services/databaseService.js';
import { Firebase } from '../services/firebaseService.js';

// ─── UI callback injected by bootstrap (avoids services→ui dependency) ─
let _toast = () => {};

export function registerAnalyticsUI(toastFn) {
  _toast = toastFn;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    _toast('Notifications not supported', 'error');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPushNotifications() {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      _toast('Notification permission denied', 'error');
      return { success: false, error: 'Permission denied' };
    }

    const msgResult = await Firebase.initMessaging();
    if (!msgResult.success) {
      console.warn('[FCM] messaging init failed:', msgResult.error);
      return { success: false, error: msgResult.error };
    }

    const { getToken } = msgResult;
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(Firebase.messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('[FCM] No token received');
      return { success: false, error: 'No FCM token received' };
    }

    const result = await Supa.savePushToken(token);

    if (result.success) {
      state.pushSubscription = { token };
      DB.save();
      return { success: true, token };
    }

    return result;

  } catch (err) {
    console.error('[FCM] Push subscription error:', err);
    return { success: false, error: err.message };
  }
}
