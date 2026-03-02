/**
 * Focus Engine — Firebase Messaging Service Worker (compatibility stub)
 * FCM messaging is handled by the main service worker (sw.js).
 * This file exists at root for Firebase SDK auto-discovery compatibility.
 */

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'Focus Engine';
  const options = {
    body: payload.notification?.body || 'Stay on track.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/', timestamp: Date.now() },
    requireInteraction: false,
    silent: false,
  };
  return self.registration.showNotification(title, options);
});
