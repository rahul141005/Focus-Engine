/**
 * Focus Engine — Firebase Messaging Service Worker (compatibility stub)
 * FCM messaging is handled by the main service worker (sw.js).
 * This file exists at root for Firebase SDK auto-discovery compatibility.
 */

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCCI3GicwvOpKFkeA2dOPYTkernd1CB2HU",
  authDomain: "focus-engine-4344e.firebaseapp.com",
  projectId: "focus-engine-4344e",
  storageBucket: "focus-engine-4344e.firebasestorage.app",
  messagingSenderId: "568481515878",
  appId: "1:568481515878:web:109384065f3e7cf8ac60a7"
};

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
