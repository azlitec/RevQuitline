'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureServiceWorker,
  requestFcmToken,
  isSupported as fcmIsSupported,
  onForegroundMessage,
} from '@/lib/firebase/client';

type UsePushNotificationsResult = {
  isSupported: boolean;
  isGranted: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  unsubscribeToken: () => Promise<boolean>;
};

function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
  return 'unknown';
}

function getDeviceName(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
  return platform || undefined;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [supported, setSupported] = useState(false);
  const [granted, setGranted] = useState<boolean>(typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<() => void>();

  // Detect support once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sup = await fcmIsSupported();
        if (mounted) setSupported(sup);
      } catch {
        if (mounted) setSupported(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Attach foreground message listener (optional: could surface to a toast system)
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const off = await onForegroundMessage((_payload) => {
          // No-op here; the app can subscribe elsewhere if needed.
          // console.log('[FCM] Foreground message', payload);
        });
        cleanup = off;
      } catch {
        cleanup = undefined;
      }
    })();
    return () => {
      cleanup?.();
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!supported) {
      setError('Push notifications are not supported in this browser.');
      return false;
    }

    try {
      setLoading(true);

      // Ensure SW is registered before token request
      const sw = await ensureServiceWorker();
      if (!sw) {
        setError('Failed to register service worker.');
        setLoading(false);
        return false;
      }

      // Request browser permission and then Firebase token
      const fcmToken = await requestFcmToken();
      const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      setGranted(perm === 'granted');

      if (!fcmToken) {
        if (perm !== 'granted') {
          setError('Notification permission denied by user.');
        } else {
          setError('Failed to obtain FCM token.');
        }
        setLoading(false);
        return false;
      }

      setToken(fcmToken);

      // Register token with backend
      const res = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: fcmToken,
          deviceType: 'web',
          deviceName: getDeviceName(),
          browser: getBrowserName(),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setError(`Failed to register push token: ${txt || res.statusText}`);
        setLoading(false);
        return false;
      }

      setLoading(false);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Unexpected error requesting notifications.');
      setLoading(false);
      return false;
    }
  }, [supported]);

  const unsubscribeToken = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!token) return true;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setLoading(false);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setError(`Failed to unsubscribe token: ${txt || res.statusText}`);
        return false;
      }
      setToken(null);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Unexpected error during unsubscribe.');
      setLoading(false);
      return false;
    }
  }, [token]);

  // Keep granted state current if user changes it outside flow
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof Notification === 'undefined') return;
      const p = Notification.permission === 'granted';
      setGranted(p);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Cleanup any dynamic subscriptions on unmount
  useEffect(() => {
    return () => {
      try {
        unsubRef.current?.();
      } catch {
        // ignore
      }
    };
  }, []);

  return useMemo(
    () => ({
      isSupported: supported,
      isGranted: granted,
      token,
      loading,
      error,
      requestPermission,
      unsubscribeToken,
    }),
    [supported, granted, token, loading, error, requestPermission, unsubscribeToken]
  );
}