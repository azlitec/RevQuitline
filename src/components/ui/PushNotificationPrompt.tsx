'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type Props = {
  className?: string;
  // Optional role hint to tailor copy
  role?: 'patient' | 'provider';
};

const LS_OPT_KEY = 'ql-push-opt'; // 'enabled' | 'denied'
const LS_DEVICE_ASKED_KEY = 'ql-push-device-asked'; // '1' if asked on this device

/**
 * Friendly modal asking user about push notifications:
 * - Explains benefits (appointment reminders, urgent messages)
 * - "Maybe Later" button only
 * - Remembers if asked on this device (localStorage)
 * - Shows only once per device on first login session
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
      ? 'Stay updated with patient notifications'
      : 'Stay updated with appointment and health notifications';
  }, [role]);

  const description = useMemo(() => {
    return role === 'provider'
      ? 'You can enable push notifications later to receive instant updates when patients send messages or results are available.'
      : 'You can enable push notifications later to get timely appointment reminders and notifications when your provider sends messages or prescriptions.';
  }, [role]);

  const shouldShow = useCallback((): boolean => {
    // Don't show if already asked on this device
    try {
      const deviceAsked = localStorage.getItem(LS_DEVICE_ASKED_KEY);
      if (deviceAsked === '1') return false;
    } catch {
      // ignore storage errors
    }

    // Don't show if already granted
    if (isGranted) return false;

    return true;
  }, [isGranted]);

  useEffect(() => {
    if (shouldShow()) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [shouldShow]);

  const onLater = useCallback(() => {
    try {
      // Mark that we've asked on this device
      localStorage.setItem(LS_DEVICE_ASKED_KEY, '1');
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
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}