/**
 * Firebase Web Client SDK initialization and FCM messaging helpers.
 * This module initializes the Firebase App on the browser, registers the
 * firebase-messaging service worker, and provides utilities to:
 *  - check whether FCM is supported by the current browser
 *  - request notification permission
 *  - obtain an FCM registration token
 *  - listen for foreground messages
 *
 * It relies on NEXT_PUBLIC_* environment variables and a service worker at:
 *   /public/firebase-messaging-sw.js
 */

import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { Messaging } from 'firebase/messaging';
import { getMessaging, isSupported as fcmIsSupported, getToken, onMessage } from 'firebase/messaging';

type FirebaseClientCache = {
  app?: FirebaseApp;
  messaging?: Messaging | null;
  swReg?: ServiceWorkerRegistration | null;
  supportChecked?: boolean;
  isSupported?: boolean;
};

declare global {
  interface Window {
    __firebaseClient__?: FirebaseClientCache;
  }
}

function getClientCache(): FirebaseClientCache {
  if (typeof window === 'undefined') return {};
  if (!window.__firebaseClient__) window.__firebaseClient__ = {};
  return window.__firebaseClient__;
}

function isDisabled(): boolean {
  // Build-time public flag wired via next.config.ts
  const disabled = process.env.NEXT_PUBLIC_DISABLE_PUSH_NOTIFICATIONS;
  return disabled === 'true';
}

function getFirebaseConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  return cfg;
}

/**
 * Initialize (or retrieve) the Firebase App on the client.
 */
export function ensureFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (isDisabled()) {
    console.warn('Firebase client disabled via NEXT_PUBLIC_DISABLE_PUSH_NOTIFICATIONS');
    return null;
  }
  const cache = getClientCache();
  if (cache.app) return cache.app;

  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
    console.warn('Firebase client config missing required NEXT_PUBLIC_* envs.');
    return null;
  }

  const app = getApps().length ? getApp() : initializeApp(config);
  cache.app = app;
  return app;
}

/**
 * Check if FCM is supported by the current browser (Chrome/Firefox/Safari recent versions).
 * Cached to avoid repeated async checks.
 */
export async function isSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isDisabled()) {
    return false;
  }
  const cache = getClientCache();
  if (cache.supportChecked) return !!cache.isSupported;
  try {
    const supported = await fcmIsSupported();
    cache.supportChecked = true;
    cache.isSupported = supported;
    return supported;
  } catch {
    cache.supportChecked = true;
    cache.isSupported = false;
    return false;
  }
}

/**
 * Register the Firebase Messaging service worker.
 * Must be called before requesting an FCM token.
 */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (isDisabled()) {
    return null;
  }
  const cache = getClientCache();
  if (cache.swReg) return cache.swReg;

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    cache.swReg = null;
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      // updateViaCache: 'none' // optional
    });
    cache.swReg = reg;
    return reg;
  } catch (err) {
    console.error('Failed to register firebase-messaging service worker:', err);
    cache.swReg = null;
    return null;
  }
}

/**
 * Get Messaging instance (returns null if not supported or not on client).
 */
export async function getClientMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (isDisabled()) {
    return null;
  }
  const cache = getClientCache();
  if (cache.messaging !== undefined) return cache.messaging ?? null;

  const supported = await isSupported();
  if (!supported) {
    cache.messaging = null;
    return null;
  }

  const app = ensureFirebaseApp();
  if (!app) {
    cache.messaging = null;
    return null;
  }

  try {
    const messaging = getMessaging(app);
    cache.messaging = messaging;
    return messaging;
  } catch (err) {
    console.error('Failed to initialize Firebase Messaging:', err);
    cache.messaging = null;
    return null;
  }
}

/**
 * Request an FCM token suitable for Web Push.
 * Requires a service worker registration and (optionally) a VAPID key.
 * Returns null if permission is denied or unavailable.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (isDisabled()) {
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn('FCM is not supported in this browser.');
    return null;
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return null;
  }

  const swReg = await ensureServiceWorker();
  const messaging = await getClientMessaging();
  if (!messaging || !swReg) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  try {
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swReg,
    });
    return token ?? null;
  } catch (err) {
    console.error('Failed to obtain FCM token:', err);
    return null;
  }
}

/**
 * Listen for foreground messages (while the page is in focus).
 */
export async function onForegroundMessage(
  handler: (payload: import('firebase/messaging').MessagePayload) => void
): Promise<() => void> {
  const messaging = await getClientMessaging();
  if (!messaging) {
    return () => {};
  }
  const unsub = onMessage(messaging, handler);
  return unsub;
}