// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Analytics Service (Push Notifications)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { VAPID_PUBLIC_KEY } from '../config/routes.js';
import { DB } from '../services/storageService.js';
import { Supa } from '../services/databaseService.js';
import { toast } from '../ui/toastController.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Notifications not supported', 'error');
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
      toast('Notification permission denied', 'error');
      return { success: false, error: 'Permission denied' };
    }

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn('VAPID key not configured');
        return { success: false, error: 'VAPID key not configured' };
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const result = await Supa.savePushSubscription(subscription);

    if (result.success) {
      state.pushSubscription = subscription.toJSON();
      DB.save();
      return { success: true, subscription };
    }

    return result;

  } catch (err) {
    console.error('Push subscription error:', err);
    return { success: false, error: err.message };
  }
}
