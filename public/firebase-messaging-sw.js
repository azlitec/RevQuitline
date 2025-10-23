/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 * - Loads Firebase compat scripts (supported pattern for SW)
 * - Dynamically imports public Firebase config from same-origin API
 * - Initializes messaging and handles background notifications
 * - Handles notification clicks to focus existing tab or open relevant page
 *
 * Notes:
 * - This worker is served as a static asset; it cannot read process.env.
 * - We import "/api/firebase/config" which returns JS setting self.__FIREBASE_CONFIG__.
 * - Ensure NEXT_PUBLIC_* Firebase envs are set in Next config for that API route.
 */

// Firebase compat scripts (SW-friendly)
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging-compat.js');

// Inject public config from server (sets self.__FIREBASE_CONFIG__)
importScripts('/api/firebase/config');

// Initialize Firebase in the Service Worker
try {
  // self.__FIREBASE_CONFIG__ is defined by /api/firebase/config
  if (self.__FIREBASE_CONFIG__) {
    firebase.initializeApp(self.__FIREBASE_CONFIG__);
  } else {
    // Fallback: attempt minimal init using Messaging Sender ID if present on global
    if (self.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
      firebase.initializeApp({ messagingSenderId: self.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID });
    } else {
      // Without config, background messaging can't work
      console.warn('[FCM SW] Missing Firebase config; background messages disabled.');
    }
  }
} catch (err) {
  console.error('[FCM SW] Firebase initialization error:', err);
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (err) {
  console.error('[FCM SW] Messaging init failed:', err);
}

/**
 * Background message handler (fires when app is in background or closed)
 */
if (messaging) {
  messaging.onBackgroundMessage(async (payload) => {
    try {
      const notif = payload.notification || {};
      const data = payload.data || {};
      const title = notif.title || 'Quitline';
      const body = notif.body || '';
      const icon = notif.icon || '/icons/icon-192x192.png';
      const image = notif.image;
      const clickUrl = data.url || notif.click_action || '/';

      const options = {
        body,
        icon,
        image,
        data: { url: clickUrl, fcmPayload: payload },
        // Add tag to collapse duplicates (e.g., per type)
        tag: data.tag || 'quitline-notification',
        renotify: true,
        requireInteraction: data.requireInteraction === 'true' || false,
        actions: data.actions ? JSON.parse(data.actions) : undefined,
      };

      await self.registration.showNotification(title, options);
    } catch (err) {
      console.error('[FCM SW] onBackgroundMessage error:', err);
    }
  });
}

/**
 * Notification click handler
 * - Focus existing client if URL already open, else open new window
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Try to focus an open tab with the same origin
      for (const client of allClients) {
        // If already at the target URL or same origin, focus and navigate
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          // Navigate to target within existing tab
          client.postMessage({ type: 'navigate', url: targetUrl });
          try {
            await client.focus();
          } catch (_) {}
          return;
        }
      }
      // Otherwise open a new window
      await clients.openWindow(targetUrl);
    })()
  );
});

/**
 * Optional: listen for messages from pages to perform SW tasks
 */
self.addEventListener('message', (event) => {
  // Reserved for future enhancements (e.g., sync token refresh)
});