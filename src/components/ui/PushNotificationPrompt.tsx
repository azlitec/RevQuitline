'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type Props = {
  className?: string;
  // Optional role hint to tailor copy
  role?: 'patient' | 'provider';
};

const LS_OPT_KEY = 'ql-push-opt'; // 'enabled' | 'denied'
const SS_DISMISS_KEY = 'ql-push-prompt-dismissed'; // '1' for this session

/**
 * Friendly modal asking user to enable push notifications:
 * - Explains benefits (appointment reminders, urgent messages)
 * - "Enable" and "Maybe Later" buttons
 * - Remembers user choice (localStorage)
 * - Shows only once per session if dismissed (sessionStorage)
 */
export default function PushNotificationPrompt({ className, role }: Props) {
  const {
    isSupported,
    isGranted,
    loading,
    error,
    requestPermission,
  } = usePushNotifications();

  const [open, setOpen] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const title = useMemo(() => {
    return role === 'provider'
      ? 'Enable push notifications for urgent patient updates'
      : 'Enable push notifications for appointment reminders and messages';
  }, [role]);

  const description = useMemo(() => {
    return role === 'provider'
      ? 'Receive instant updates when patients send messages or results are available. You can manage your preferences anytime.'
      : 'Get timely appointment reminders and notifications when your provider sends messages or prescriptions. You can manage your preferences anytime.';
  }, [role]);

  const shouldShow = useCallback((): boolean => {
    if (!isSupported) return false;

    // Already granted -> no need to show
    if (isGranted) return false;

    // If browser permission already denied, don't keep prompting
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return false;
    }

    // If user already opted in or denied previously, don't show
    try {
      const opt = localStorage.getItem(LS_OPT_KEY);
      if (opt === 'enabled' || opt === 'denied') return false;
    } catch {
      // ignore storage errors
    }

    // If dismissed in this session, don't show again
    try {
      const dismissed = sessionStorage.getItem(SS_DISMISS_KEY);
      if (dismissed === '1') return false;
    } catch {
      // ignore storage errors
    }

    return true;
  }, [isSupported, isGranted]);

  useEffect(() => {
    if (shouldShow()) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [shouldShow]);

  const onEnable = useCallback(async () => {
    setInternalError(null);
    const ok = await requestPermission();
    // reflect latest state
    const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default';

    if (ok && perm === 'granted') {
      try {
        localStorage.setItem(LS_OPT_KEY, 'enabled');
      } catch {}
      setOpen(false);
    } else {
      // If user denied, remember permanently to avoid nagging
      if (perm === 'denied') {
        try {
          localStorage.setItem(LS_OPT_KEY, 'denied');
        } catch {}
        setOpen(false);
      } else {
        // Permission not granted, show error
        setInternalError('Unable to enable notifications. You can try again later from Settings.');
      }
    }
  }, [requestPermission]);

  const onLater = useCallback(() => {
    try {
      sessionStorage.setItem(SS_DISMISS_KEY, '1');
    } catch {}
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${className ?? ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-prompt-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="px-6 pt-5">
          <h2 id="push-prompt-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
            <li>Appointment reminders</li>
            <li>New messages and urgent updates</li>
            <li>Prescription and lab result notifications</li>
          </ul>
          {error || internalError ? (
            <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {internalError || error}
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 px-6 pb-5">
          <button
            type="button"
            onClick={onLater}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={onEnable}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}