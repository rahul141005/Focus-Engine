# Focus Engine — Firebase Setup Guide

> Complete, production-grade Firebase configuration guide for the Focus Engine PWA.
> Uses Firebase modular SDK (v11+), Firestore, and Firebase Cloud Messaging (FCM).

---

## Table of Contents

1. [Project Creation](#1-project-creation)
2. [Firestore Database Setup](#2-firestore-database-setup)
3. [Firestore Data Model](#3-firestore-data-model)
4. [Firebase SDK Configuration](#4-firebase-sdk-configuration)
5. [Database Service Implementation](#5-database-service-implementation)
6. [Push Notifications (FCM)](#6-push-notifications-fcm)
7. [PWA + Service Worker Integration](#7-pwa--service-worker-integration)
8. [Data Integrity & Async Safety](#8-data-integrity--async-safety)
9. [Performance Best Practices](#9-performance-best-practices)
10. [Debugging Checklist](#10-debugging-checklist)
11. [Production Validation Checklist](#11-production-validation-checklist)
12. [Future Extension Path](#12-future-extension-path)

---

## 1. Project Creation

### Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or **"Add project"**)
3. Enter a project name: `focus-engine`
4. **Google Analytics**: You can disable this for a personal app. If enabled, it adds usage tracking — not needed for Focus Engine.
5. Click **"Create project"** and wait for provisioning.

### Step 2: Register a Web App

1. In the Firebase console, click the **gear icon** (⚙️) → **"Project settings"**
2. Scroll to **"Your apps"** → click the **web icon** (`</>`)
3. Enter app nickname: `Focus Engine`
4. **Do NOT** check "Also set up Firebase Hosting" (we deploy separately)
5. Click **"Register app"**

### Step 3: Copy Firebase Config

After registration, Firebase shows a config object:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",          // Public key for API access (safe in frontend)
  authDomain: "focus-engine.firebaseapp.com",  // Auth redirect domain
  projectId: "focus-engine",    // Unique project identifier
  storageBucket: "focus-engine.firebasestorage.app", // File storage bucket
  messagingSenderId: "123456",  // FCM sender ID for push notifications
  appId: "1:123456:web:abc123"  // Unique app identifier
};
```

**What each key means:**

| Key | Purpose | Safe in frontend? |
|-----|---------|-------------------|
| `apiKey` | Identifies your project to Firebase APIs | ✅ Yes — restricted by Firestore security rules |
| `authDomain` | Domain for authentication redirects | ✅ Yes |
| `projectId` | Unique project identifier | ✅ Yes |
| `storageBucket` | Cloud Storage bucket name | ✅ Yes |
| `messagingSenderId` | Identifies your project for FCM push | ✅ Yes |
| `appId` | Unique app identifier | ✅ Yes |

> **Why is the config safe in frontend code?**
> Firebase config keys are **not secrets**. They only identify your project. Security is enforced by **Firestore security rules**, not by hiding the config. This is the same model as Google Maps API keys.

### Step 4: Where to Place Config

In Focus Engine, paste your config values into `js/config/routes.js`:

```js
export const FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export const FCM_VAPID_KEY = 'YOUR_VAPID_KEY';
```

Also update the same config in these service worker files:
- `sw.js` (lines 11–18)
- `firebase-messaging-sw.js` (lines 10–17)

> ⚠️ Service workers cannot import ES modules, so the config is duplicated there using `importScripts`.

---

## 2. Firestore Database Setup

### Why Firestore (not Realtime Database)

| Feature | Firestore | Realtime Database |
|---------|-----------|-------------------|
| Data model | Collections + Documents | Single JSON tree |
| Queries | Rich (multi-field, sorting) | Limited |
| Offline support | Built-in | Built-in |
| Scaling | Automatic | Manual sharding |
| Pricing | Per read/write/delete | Per bandwidth |

Firestore is the modern choice for structured data like Focus Engine's study sessions, tasks, and analytics.

### Step 1: Create Firestore Database

1. In Firebase console → **Build** → **Firestore Database**
2. Click **"Create database"**
3. **Region**: Choose the closest to your location:
   - India: `asia-south1` (Mumbai)
   - US: `us-central1` (Iowa)
   - Europe: `europe-west1` (Belgium)
   - ⚠️ Region **cannot be changed** after creation
4. **Security rules**: Start with **"Test mode"** (allows all reads/writes for 30 days)
5. Click **"Create"**

### Step 2: Security Rules

#### Test Mode (Development)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### Personal App (No Auth, Production)

For a single-user personal app, restrict by time or allow all:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> For a personal app not exposed publicly, open rules are acceptable. If you ever make the app multi-user, see [Section 12](#12-future-extension-path) for auth-based rules.

#### Future: Auth-Protected Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /days/{dayId} {
      allow read, write: if request.auth != null;
    }
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
    match /personalTasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /questionAnalytics/{docId} {
      allow read, write: if request.auth != null;
    }
    match /pushTokens/{tokenId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 3. Firestore Data Model

Focus Engine uses 6 Firestore collections. Each document uses a client-generated UUID as its document ID.

### Collection: `days`

Represents a study day in the plan.

```json
{
  "id": "d_1709123456789_abc12",
  "label": "Day 1 — Quant Basics",
  "date": "2026-03-01",
  "created_at": "2026-03-01T10:30:00.000Z"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Client-generated unique ID (also the document ID) |
| `label` | `string` | Human-readable day name |
| `date` | `string` (ISO date) | Scheduled date (`YYYY-MM-DD`) or `null` |
| `created_at` | `string` (ISO timestamp) | When the day was created |

### Collection: `tasks`

Represents a study task within a day.

```json
{
  "id": "t_1709123456790_def34",
  "day_id": "d_1709123456789_abc12",
  "subject": "Quant",
  "topic": "Number Systems",
  "estimated_minutes": 45,
  "status": "pending",
  "created_at": "2026-03-01T10:31:00.000Z"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique task ID |
| `day_id` | `string` | Reference to parent day's `id` |
| `subject` | `string` | Subject category (`Quant`, `LR`, `AR`, `VA`, `Practice`, `Other`) |
| `topic` | `string` | Specific study topic |
| `estimated_minutes` | `number` | Planned duration in minutes |
| `status` | `string` | `"pending"` or `"completed"` |
| `created_at` | `string` | When the task was created |

### Collection: `sessions`

Represents a completed focus session.

```json
{
  "id": "s_1709123456791_ghi56",
  "subject": "Quant",
  "topic": "Number Systems",
  "duration_seconds": 2700,
  "session_date": "2026-03-01",
  "created_at": "2026-03-01T11:15:00.000Z"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique session ID |
| `subject` | `string` | Subject studied |
| `topic` | `string` | Topic studied |
| `duration_seconds` | `number` | Total active time in seconds |
| `session_date` | `string` | Date of the session (`YYYY-MM-DD`) |
| `created_at` | `string` | When the session record was created |

> Sessions under 2 minutes (`MIN_SESSION_SECONDS = 120`) are automatically discarded and never saved.

### Collection: `personalTasks`

Represents personal to-do items (not study tasks).

```json
{
  "id": "pt_1709123456792_jkl78",
  "text": "Buy notebook",
  "completed": false,
  "date": "2026-03-01",
  "frequency": "once",
  "priority": "high",
  "created_at": "2026-03-01T09:00:00.000Z"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique personal task ID |
| `text` | `string` | Task description |
| `completed` | `boolean` | Completion state |
| `date` | `string` | Date associated with the task |
| `frequency` | `string` | `"once"`, `"daily"`, or `"weekly"` |
| `priority` | `string` | `"none"`, `"low"`, `"medium"`, or `"high"` |
| `created_at` | `string` | When the task was created |

### Collection: `questionAnalytics`

Tracks per-question timing from "Timed Q" mode sessions.

```json
{
  "id": "qa_1709123456793_mno90",
  "sessionId": "s_1709123456791_ghi56",
  "subject": "Quant",
  "topic": "Number Systems",
  "date": "2026-03-01",
  "questions": [
    { "number": 1, "seconds": 180, "skipped": false },
    { "number": 2, "seconds": 95, "skipped": false },
    { "number": 3, "seconds": 0, "skipped": true }
  ],
  "created_at": "2026-03-01T11:15:00.000Z"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Unique analytics record ID |
| `sessionId` | `string` | Reference to the parent session |
| `subject` | `string` | Subject studied |
| `topic` | `string` | Topic studied |
| `date` | `string` | Session date |
| `questions` | `array` | Array of question timing objects |
| `created_at` | `string` | When the record was created |

### Collection: `pushTokens`

Stores the device's FCM push notification token.

```json
{
  "token": "fMr4K8j...",
  "updated_at": "2026-03-01T10:00:00.000Z"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `token` | `string` | FCM device token |
| `updated_at` | `string` | When the token was last refreshed |

> This collection uses a fixed document ID `"device"` to prevent duplicate tokens. Each `setDoc` overwrites the previous token.

### Indexing

Firestore automatically creates single-field indexes. Focus Engine queries use `orderBy('created_at')` on all collections, which Firestore handles automatically.

No composite indexes are required for the current query patterns.

---

## 4. Firebase SDK Configuration

### How Focus Engine Loads Firebase

Focus Engine uses **dynamic imports** from the Firebase CDN — no npm/bundler required:

```js
// In js/services/firebaseService.js
const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
const firestore = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
```

This approach:
- ✅ Works without Node.js or bundlers
- ✅ Uses the modular SDK (tree-shakeable)
- ✅ Loads Firebase lazily (only when needed)
- ✅ Compatible with vanilla ES modules

### File Structure

```
js/
├── config/
│   └── routes.js              ← Firebase config + VAPID key
├── services/
│   ├── firebaseService.js     ← Firebase init + Firestore CRUD
│   ├── databaseService.js     ← FireDB wrapper (sync + business logic)
│   ├── analyticsService.js    ← FCM push notification management
│   └── storageService.js      ← LocalStorage persistence
```

**Architecture:**
- `firebaseService.js` — Low-level Firebase operations (init, CRUD)
- `databaseService.js` — Application-level operations (sync, insert, update, delete)
- `analyticsService.js` — Push notification subscription and permissions
- `storageService.js` — LocalStorage read/write (offline backup)

### Avoiding Circular Dependencies

The service layer follows a strict dependency order:

```
config/routes.js → firebaseService.js → databaseService.js → analyticsService.js
                                      ↕
                              storageService.js
```

No service imports from `core/` or `ui/`. UI callbacks are injected via `registerAnalyticsUI()` pattern to avoid layer violations.

---

## 5. Database Service Implementation

### Architecture Overview

All Firestore operations follow this pattern:

```js
async function operation() {
  try {
    await firestoreWrite(...);
    return { success: true, data: ... };
  } catch (err) {
    console.error('[Firebase] operation failed:', err);
    return { success: false, error: err.message };
  }
}
```

**Key Design Decisions:**

1. **All writes use `async/await`** — No fire-and-forget writes
2. **All writes wrapped in `try/catch`** — No silent failures
3. **Structured return objects** — Always `{ success, data?, error? }`
4. **Client-generated IDs** — `uid()` creates IDs before Firestore write, preventing duplicates
5. **`setDoc` for inserts** — Uses document ID as key, making writes idempotent (safe to retry)

### Sync Strategy

On app startup, `databaseService.js` runs a bidirectional sync for each collection:

1. **Pull**: Fetch all remote documents, add any not present locally
2. **Push**: For each local document not present remotely, write to Firestore
3. **Save**: Persist merged state to LocalStorage

```js
async syncDays() {
  const result = await Firebase.getAll('days');      // 1. Pull from Firestore
  const remote = result.data || [];
  // Merge remote → local
  for (const item of remote) {
    if (!localIds.has(item.id)) state.days.push(item);
  }
  DB.save();                                          // 3. Save to localStorage
  // Push local → remote
  for (const item of state.days) {
    if (!remoteIds.has(item.id)) {
      await Firebase.setDoc('days', item.id, item);   // 2. Push to Firestore
    }
  }
}
```

This ensures:
- ✅ No data loss if offline during creation
- ✅ No duplicates (matching by `id`)
- ✅ localStorage serves as offline fallback

---

## 6. Push Notifications (FCM)

### Step 1: Enable Cloud Messaging

1. In Firebase console → **Project settings** (⚙️)
2. Go to the **"Cloud Messaging"** tab
3. Under **"Web Push certificates"**, click **"Generate key pair"**
4. Copy the key — this is your **VAPID key**
5. Paste it in `js/config/routes.js`:

```js
export const FCM_VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
```

### Step 2: Service Worker Setup

FCM requires a service worker at the root of your domain. Focus Engine uses two SW files:

**`sw.js`** — Main service worker (caching + FCM background messages):
```js
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({ /* your config */ });
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  return self.registration.showNotification(
    payload.notification?.title || 'Focus Engine',
    { body: payload.notification?.body || 'Stay on track.' }
  );
});
```

**`firebase-messaging-sw.js`** — Compatibility stub (for Firebase SDK auto-discovery):
- Contains the same Firebase init and `onBackgroundMessage` handler
- Exists because Firebase SDK looks for this file at root by default
- Ensures compatibility regardless of which SW is active

> ⚠️ Service workers **cannot** use ES module imports. They must use `importScripts()` with the compat SDK.

### Step 3: Permission Request

Notification permission **must** be requested after a user interaction (click/tap). Never request on page load.

```js
// In analyticsService.js — called when user toggles notification setting
export async function subscribeToPushNotifications() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const msgResult = await Firebase.initMessaging();
  const { getToken, onMessage } = msgResult;

  // Get FCM token
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(Firebase.messaging, {
    vapidKey: FCM_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  // Save token to Firestore (fixed ID prevents duplicates)
  await FireDB.savePushToken(token);

  // Handle foreground messages
  onMessage(Firebase.messaging, (payload) => {
    new Notification(payload.notification?.title || 'Focus Engine', {
      body: payload.notification?.body || 'Stay on track.',
    });
  });
}
```

### Step 4: Sending Test Notifications

1. In Firebase console → **Engage** → **Messaging**
2. Click **"Create your first campaign"** → **"Firebase Notification messages"**
3. Enter title and body text
4. Click **"Send test message"**
5. Paste your FCM token (from Firestore `pushTokens/device` document)
6. Click **"Test"**

### Duplicate Token Prevention

The `savePushToken` method uses a fixed document ID (`'device'`):

```js
async savePushToken(token) {
  return await Firebase.setDoc('pushTokens', 'device', {
    token,
    updated_at: new Date().toISOString(),
  });
}
```

`setDoc` with a fixed ID **overwrites** the previous document. This means:
- ✅ Only one token stored at a time
- ✅ Token refresh automatically replaces the old token
- ✅ No duplicate token documents

---

## 7. PWA + Service Worker Integration

### How the Two Service Workers Coexist

Focus Engine has two SW files at root:

| File | Purpose | Registration |
|------|---------|-------------|
| `sw.js` | Caching + push handlers + FCM background messages | Registered by `bootstrap.js` |
| `firebase-messaging-sw.js` | FCM compatibility stub | Auto-discovered by Firebase SDK |

**Why this works:**
- `sw.js` is explicitly registered and handles all caching, push events, and FCM background messages
- `firebase-messaging-sw.js` exists as a fallback for Firebase SDK's auto-discovery mechanism
- Only one SW controls the page at any time (the one registered first — `sw.js`)

### Cache Version Bumping

When you deploy changes, update the cache version in `sw.js`:

```js
const CACHE_VERSION = 'focus-engine-v5';  // Increment on each deploy
```

The activate event automatically purges old caches:

```js
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});
```

### Common PWA + FCM Mistakes to Avoid

1. **Don't register two SWs for the same scope** — Only register `sw.js`
2. **Don't cache Firebase CDN URLs** — The SW skips `.googleapis.com` and `.gstatic.com` domains
3. **Don't forget `self.skipWaiting()`** — Ensures the new SW activates immediately
4. **Don't forget `clients.claim()`** — Ensures the new SW controls existing tabs
5. **Always bump cache version** — Stale cached JS files are the #1 cause of "my changes aren't showing"

---

## 8. Data Integrity & Async Safety

### Race Condition Prevention

**Session save flow in `endSession()`:**

```
1. session.active = false          ← Prevents double-end
2. stopSessionTimer()               ← Stops timer immediately
3. Build record object              ← Create session data
4. state.sessions.push(record)      ← Add to local state
5. DB.save()                        ← Persist to localStorage
6. await FireDB.insertSession()     ← Write to Firestore (awaited!)
7. await FireDB.insertQA()          ← Write QA if applicable (awaited!)
8. Show summary UI                  ← Only after writes complete
```

**Why the order matters:**
- Step 1 prevents `endSession()` from being called twice (rapid click protection)
- Steps 4-5 ensure data is saved locally even if Firestore write fails
- Steps 6-7 are `await`ed — the UI doesn't open until writes resolve
- Notes (step 8 → summary overlay) can only reference `record.id` because the session is already saved

### Preventing Duplicate Writes

All document IDs are generated client-side using `uid()`:

```js
// From js/utils/timeUtils.js
export function uid() {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
```

Combined with `setDoc` (not `addDoc`), this makes writes **idempotent**:
- If the same `uid()` is written twice, Firestore overwrites (no duplicate)
- If the network fails and retries, the same document is simply overwritten

### Handling Rapid Clicks

- `endSession()` checks `session.active` at the top — if already false, returns immediately
- `closeSummary()` checks `appLocals.savingNotes` — if already saving, returns immediately
- UI buttons are disabled during save operations

### Offline Handling

1. **LocalStorage first**: All data mutations save to localStorage immediately via `DB.save()`
2. **Firestore second**: Writes are attempted but failures are caught silently
3. **Sync on reconnect**: `tryFirebaseInit()` runs on app start, syncing any local-only data to Firestore

---

## 9. Performance Best Practices

### What Focus Engine Does Right

1. **No Firestore reads in timer loop** — The 1-second timer (`tickSession`) only updates DOM, never reads from Firestore
2. **Lazy Firebase loading** — Firebase SDK is loaded via `import()` only when first needed
3. **Selective sync** — Sync runs once on startup, not on every user action
4. **LocalStorage as primary** — Most reads come from in-memory `state` object, not Firestore
5. **Debounced search** — Plan search uses `debounce()` to avoid re-renders on every keystroke

### What to Watch For

1. **Don't fetch collections inside `setInterval`** — This would create 1 Firestore read per second
2. **Don't re-render entire UI on timer tick** — Only update the timer display element
3. **Don't call `DB.save()` on every timer tick** — Save only on state changes
4. **Don't use `getDocs()` when you can use `getDoc()`** — Fetch single documents when possible
5. **Batch writes for CSV import** — The CSV import uses sequential `await` for each task. For large imports, consider Firestore batched writes (max 500 per batch)

---

## 10. Debugging Checklist

### Firestore Write Fails

1. **Check browser console** for `[Firebase]` error logs
2. **Verify config** in `js/config/routes.js` — all values must be real (not placeholders)
3. **Check Firestore rules** — ensure they allow writes
4. **Check network tab** — look for failed requests to `firestore.googleapis.com`
5. **Verify Firestore exists** — check Firebase console → Firestore Database
6. **Check document** in Firebase console → Firestore → Browse collection

### FCM Token Not Generated

1. **HTTPS required** — FCM only works on HTTPS (or localhost for dev)
2. **Check permission** — `Notification.permission` must be `'granted'`
3. **Check VAPID key** — must match the key from Firebase console → Cloud Messaging
4. **Check SW registration** — `navigator.serviceWorker.getRegistrations()` should show your SW
5. **iOS limitation** — iOS Safari requires the app to be installed as PWA for notifications (iOS 16.4+)
6. **Check console** for `[FCM]` error logs

### Push Notification Not Received

1. **Check token validity** — Re-generate token and update Firestore
2. **Background**: Verify `onBackgroundMessage` in `sw.js` is working
3. **Foreground**: Verify `onMessage` in `analyticsService.js` is registered
4. **Test via Firebase console** → Messaging → Send test message with your token
5. **Check if app is focused** — Background messages only fire when app is not in foreground
6. **Check notification settings** — OS-level notification permissions may block

### Session Not Saving

1. **Check `session.active`** — Must be `true` when `endSession()` is called
2. **Check duration** — Sessions under 2 minutes (`MIN_SESSION_SECONDS = 120`) are intentionally not saved
3. **Check await chain** — `endSession()` must be `async` and `FireDB.insertSession()` must be `await`ed
4. **Check network** — If Firestore write fails, the session is still in localStorage (check `fe_state` in Application → Local Storage)
5. **Check for errors** — Look for `[Firebase] setDoc` errors in console

### Service Worker Issues

1. **Force refresh**: Chrome → DevTools → Application → Service Workers → check "Update on reload"
2. **Unregister**: Application → Service Workers → Unregister → Reload page
3. **Clear cache**: Application → Storage → "Clear site data"
4. **Check scope**: SW must be at root (`/sw.js`, not `/js/sw.js`)
5. **Check imports**: SW `importScripts` URLs must not 404
6. **Update version**: Bump `CACHE_VERSION` in `sw.js` and redeploy

### Debugging Commands (Browser Console)

```js
// Check service worker registrations
navigator.serviceWorker.getRegistrations().then(r => console.log(r));

// Check notification permission
console.log(Notification.permission);

// Check localStorage state
JSON.parse(localStorage.getItem('fe_state'));

// Check FCM token
JSON.parse(localStorage.getItem('fe_state')).pushSubscription;

// Force Firebase re-init
// (Reload the page — tryFirebaseInit runs on startup)
```

---

## 11. Production Validation Checklist

### Firestore Write Tests

- [ ] Create a day → verify appears in Firestore `days` collection
- [ ] Add a task → verify in `tasks` collection
- [ ] Complete a 2+ minute session → verify in `sessions` collection
- [ ] Complete a Timed Q session → verify in `questionAnalytics` collection
- [ ] Add a personal task → verify in `personalTasks` collection
- [ ] Toggle notification on → verify token in `pushTokens` collection

### Push Notification Tests

- [ ] Request permission → Accept → Token generated
- [ ] Request permission → Deny → Graceful error message
- [ ] Send test notification from Firebase console → Received
- [ ] App in foreground → Notification shows
- [ ] App in background → Notification shows
- [ ] Click notification → App opens/focuses

### Offline Tests

- [ ] Disconnect network → Create task → Task saved to localStorage
- [ ] Reconnect → Open app → Task synced to Firestore
- [ ] Disconnect → Complete session → Session saved locally
- [ ] Disconnect → App still usable (timer, UI all work)

### PWA Install Tests

- [ ] "Add to Home Screen" prompt appears
- [ ] App installs successfully
- [ ] Installed app opens fullscreen
- [ ] Push notifications work when installed
- [ ] App works offline when installed

### Mobile Tests

- [ ] Touch interactions work (no hover-only elements)
- [ ] Session overlay displays correctly
- [ ] Fullscreen mode works during sessions
- [ ] Orientation doesn't break layout
- [ ] Virtual keyboard doesn't break layout

### Security Tests

- [ ] No Firebase config in console.log output
- [ ] No API keys visible in error messages shown to user
- [ ] All user text escaped with `esc()` before HTML insertion
- [ ] No `innerHTML` with unescaped user data

---

## 12. Future Extension Path

### Adding Authentication

1. Enable Firebase Authentication in console
2. Add `firebase-auth.js` import
3. Create sign-in flow (Google, email/password, etc.)
4. Update Firestore rules to check `request.auth.uid`
5. Add `userId` field to all documents
6. Update queries to filter by `userId`

### Multi-Device Sync

1. Use Firestore's `onSnapshot()` for real-time listeners
2. Replace pull-based sync with real-time subscriptions
3. Add conflict resolution (last-write-wins or merge)

### Scheduled Notifications

1. Create a Firebase Cloud Function
2. Use Cloud Scheduler to trigger it
3. Function reads user settings from Firestore
4. Function sends FCM messages via Admin SDK

### Cloud Functions

```
firebase-functions/
├── index.js
├── scheduledNotifications.js
└── package.json
```

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize functions: `firebase init functions`
3. Deploy: `firebase deploy --only functions`

### Hardening Security (Public App)

1. Enable Firebase Authentication
2. Add per-user document rules:
   ```
   match /sessions/{sessionId} {
     allow read, write: if request.auth.uid == resource.data.userId;
   }
   ```
3. Add rate limiting via Cloud Functions
4. Enable App Check for API abuse prevention
5. Add input validation in security rules:
   ```
   allow create: if request.resource.data.keys().hasAll(['id', 'subject', 'topic'])
                 && request.resource.data.duration_seconds is number;
   ```

---

## Quick Reference

### Config Files to Update

| File | What to update |
|------|---------------|
| `js/config/routes.js` | `FIREBASE_CONFIG` + `FCM_VAPID_KEY` |
| `sw.js` (lines 11–18) | Firebase config in `firebase.initializeApp()` |
| `firebase-messaging-sw.js` (lines 10–17) | Firebase config in `firebase.initializeApp()` |

### Firestore Collections

| Collection | Document ID | Key fields |
|------------|-------------|------------|
| `days` | `d_*` | `label`, `date`, `created_at` |
| `tasks` | `t_*` | `day_id`, `subject`, `topic`, `status`, `created_at` |
| `sessions` | `s_*` | `subject`, `topic`, `duration_seconds`, `session_date`, `created_at` |
| `personalTasks` | `pt_*` | `text`, `completed`, `frequency`, `priority`, `created_at` |
| `questionAnalytics` | `qa_*` | `sessionId`, `questions[]`, `created_at` |
| `pushTokens` | `device` | `token`, `updated_at` |

### Firebase SDK Versions

| Component | Version | URL |
|-----------|---------|-----|
| App | 11.6.0 | `firebase-app.js` |
| Firestore | 11.6.0 | `firebase-firestore.js` |
| Messaging | 11.6.0 | `firebase-messaging.js` |
| App Compat (SW) | 11.6.0 | `firebase-app-compat.js` |
| Messaging Compat (SW) | 11.6.0 | `firebase-messaging-compat.js` |
