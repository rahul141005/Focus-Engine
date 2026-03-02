// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Push Service (Firebase Cloud Messaging)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { FCM_VAPID_KEY } from '../config/routes.js';
import { DB } from '../services/storageService.js';
import { FireDB } from '../services/databaseService.js';
import { Firebase } from '../services/firebaseService.js';

// ─── UI callback injected by bootstrap (avoids services→ui dependency) ─
let _toast = () => {};
let _foregroundListenerRegistered = false;
let _tokenRefreshRegistered = false;

const TOKEN_REFRESH_INTERVAL_MS = 3600000; // 1 hour

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

    const { getToken, onMessage } = msgResult;
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(Firebase.messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('[FCM] No token received');
      return { success: false, error: 'No FCM token received' };
    }

    // Handle foreground messages (background handled by SW)
    if (!_foregroundListenerRegistered) {
      try {
        onMessage(Firebase.messaging, (payload) => {
          // Use safe fallbacks: notification fields → data fields → defaults
          const title = payload.notification?.title || payload.data?.title || 'Focus Engine';
          const body  = payload.notification?.body  || payload.data?.body  || 'Stay on track.';
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/icons/icon-192.png',
            });
          }
        });
        _foregroundListenerRegistered = true;
      } catch (listenerErr) {
        console.warn('[FCM] foreground listener registration failed:', listenerErr);
      }
    }

    // Avoid duplicate token writes — skip if token unchanged
    if (state.pushSubscription?.token === token) {
      return { success: true, token };
    }

    const result = await FireDB.savePushToken(token);

    if (result.success) {
      state.pushSubscription = { token };
      DB.save();

      // Set up token refresh handler
      if (!_tokenRefreshRegistered) {
        _tokenRefreshRegistered = true;
        // Periodically check for token refresh (Firebase v9+ does not have onTokenRefresh)
        setInterval(async () => {
          try {
            const refreshedToken = await getToken(Firebase.messaging, {
              vapidKey: FCM_VAPID_KEY,
              serviceWorkerRegistration: await navigator.serviceWorker.ready,
            });
            if (refreshedToken && refreshedToken !== state.pushSubscription?.token) {
              await FireDB.savePushToken(refreshedToken);
              state.pushSubscription = { token: refreshedToken };
              DB.save();
            }
          } catch (e) {
            console.warn('[FCM] Token refresh check failed:', e);
          }
        }, TOKEN_REFRESH_INTERVAL_MS);
      }

      return { success: true, token };
    }

    return result;

  } catch (err) {
    console.error('[FCM] Push subscription error:', err);
    return { success: false, error: err.message };
  }
}
