/**
 * Focus Engine — Service Worker
 * Strategy: Cache-first for assets, network-first for API calls
 * Implements: Offline caching, Push notifications (FCM), Background sync
 */

// ─── Firebase Cloud Messaging (background push) ─────────────────────────────
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

const CACHE_VERSION  = 'focus-engine-v5';
const STATIC_ASSETS  = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/js/main.js',
  '/js/bootstrap.js',
  '/js/config/constants.js',
  '/js/config/routes.js',
  '/js/core/appState.js',
  '/js/core/timerEngine.js',
  '/js/core/sessionEngine.js',
  '/js/core/questionEngine.js',
  '/js/services/storageService.js',
  '/js/services/databaseService.js',
  '/js/services/firebaseService.js',
  '/js/services/analyticsService.js',
  '/js/ui/renderEngine.js',
  '/js/ui/sessionView.js',
  '/js/ui/tabsController.js',
  '/js/ui/modalController.js',
  '/js/ui/toastController.js',
  '/js/features/notesFeature.js',
  '/js/features/progressFeature.js',
  '/js/features/backlogFeature.js',
  '/js/features/planFeature.js',
  '/js/utils/timeUtils.js',
  '/js/utils/formatUtils.js',
  '/js/utils/debounce.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
];

// ─── Push notification message bank ──────────────────────────────────────────
const NOTIFICATION_MESSAGES = {
  morning: [
    { title: 'Focus Engine', body: 'Start small. Momentum beats motivation.' },
    { title: 'Focus Engine', body: 'Your study day is ready. One task at a time.' },
    { title: 'Focus Engine', body: 'A consistent start builds an unstoppable finish.' },
    { title: 'Focus Engine', body: 'Today\'s targets are waiting. You\'ve got this.' },
  ],
  inactivity: [
    { title: 'Focus Engine', body: 'A short focus sprint keeps the day alive.' },
    { title: 'Focus Engine', body: 'Even 20 minutes moves the needle.' },
    { title: 'Focus Engine', body: 'Pick up where you left off — it\'s never too late.' },
    { title: 'Focus Engine', body: 'The hardest part is starting. You\'re already close.' },
  ],
  evening: [
    { title: 'Focus Engine', body: 'Day winding down — every completed task counts.' },
    { title: 'Focus Engine', body: 'Finish strong. One more session before the day ends.' },
    { title: 'Focus Engine', body: 'Consistent effort, compounding results.' },
    { title: 'Focus Engine', body: 'Review what you covered today — reinforcement matters.' },
  ],
  consistency: [
    { title: 'Focus Engine 🔥', body: 'Third day in a row — consistency is building.' },
    { title: 'Focus Engine 🔥', body: 'A week of focused effort. Your future self thanks you.' },
    { title: 'Focus Engine', body: 'Steady progress — the surest path to exam readiness.' },
  ],
};

// ─── Install — cache static assets ───────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing…');
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      const promises = STATIC_ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
      );
      return Promise.allSettled(promises);
    }).then(() => {
      console.log('[SW] Static assets cached');
      return self.skipWaiting();
    })
  );
});

// ─── Activate — clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch — cache strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, Firebase API calls, chrome-extension
  if (request.method !== 'GET') return;
  if (url.hostname.endsWith('.firebaseio.com') || url.hostname.endsWith('.googleapis.com') || url.hostname.endsWith('.gstatic.com')) return;
  if (url.protocol === 'chrome-extension:') return;

  // Navigation: network-first with fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Fonts & CDN resources: cache-first
  if (url.hostname.includes('fonts.') || url.hostname.includes('cdnjs.')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // App assets: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || !response.ok) return response;
        const responseToCache = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, responseToCache));
        return response;
      }).catch(() => {
        // Offline fallback for HTML
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ─── Push notification handler ────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Focus Engine', body: 'Stay on track.' };
  try {
    data = event.data.json();
  } catch(e) {
    try { data.body = event.data.text(); } catch(_) {}
  }

  const options = {
    body:    data.body,
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data:    { url: '/', timestamp: Date.now() },
    actions: [
      { action: 'open',   title: 'Open App'  },
      { action: 'dismiss',title: 'Later'     },
    ],
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification click handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow('/');
    })
  );
});

// ─── Background sync (for queued Firebase writes when offline) ────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // In a full implementation, this would read from IndexedDB
  // and push queued writes to Firebase when connectivity is restored
  console.log('[SW] Background sync: syncing pending data');
}

// ─── Message handler (from app → SW) ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { notifType, delayMs } = event.data;
    setTimeout(() => {
      const msgs = NOTIFICATION_MESSAGES[notifType] || NOTIFICATION_MESSAGES.morning;
      const msg  = msgs[Math.floor(Math.random() * msgs.length)];
      self.registration.showNotification(msg.title, {
        body:    msg.body,
        icon:    '/icons/icon-192.png',
        badge:   '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        silent:  false,
      });
    }, delayMs || 0);
  }
});
