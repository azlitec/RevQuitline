# Firebase Cloud Messaging (FCM) Setup Guide for Quitline (Web Push)

This document describes how to configure Firebase Cloud Messaging for web push notifications in Quitline (Next.js 14) and how to provision environment variables and validate the integration end-to-end.

## Overview

Quitline uses:
- Firebase Admin SDK server-side to send push notifications to device tokens
- Firebase Web Client SDK in the browser to request permission and obtain an FCM registration token
- A service worker at `/public/firebase-messaging-sw.js` to handle background notifications
- Prisma models for `PushSubscription` and `NotificationPreference` for token management and per-user notification preferences
- API routes for token subscribe/unsubscribe and preferences
- Background cron job for appointment reminders
- Admin broadcast interface to test and monitor delivery

## Prerequisites

- Firebase Console access (Project Owner or Editor)
- Service account management permissions
- Next.js app deployment target (Vercel or your platform)
- Database configured and Prisma migrations applied

## 1. Create Firebase Project and Web App

1. Go to Firebase Console and create a new project (or use an existing one).
2. Under Build → Authentication, optionally set up if needed later (not required for messaging).
3. Under Build → Cloud Messaging:
   - Verify Cloud Messaging is enabled.
4. Under Project Overview → Add App → Web:
   - Register a web app (e.g., `quitline-web`).
   - Obtain the web app config values:
     - API Key
     - Auth Domain
     - Project ID
     - Messaging Sender ID
     - App ID

These map to public client env variables described below.

## 2. Create a Service Account for Admin SDK

1. Go to the Google Cloud Console for the Firebase project.
2. IAM & Admin → Service Accounts.
3. Create service account (e.g., `quitline-fcm-admin`).
4. Grant role: Editor (or restricted role for Cloud Messaging).
5. Create a JSON key and download it.

The JSON key contains:
- `project_id`
- `client_email`
- `private_key`

These map to server env variables described below.

## 3. Environment Variables

Create `.env` with the following variables. Keep private values secret. Do not commit `.env` to version control.

Server-side (Admin SDK):
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...==\n-----END PRIVATE KEY-----\n"
```

Client-side (Web SDK):
```
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_MESSAGING_SENDER_ID=1234567890
FIREBASE_APP_ID=1:1234567890:web:abcdef123456
# Optional: VAPID key if configured in Firebase Console > Cloud Messaging
FIREBASE_VAPID_KEY=BBJ...-your-vapid-key
```

Notes:
- `FIREBASE_PRIVATE_KEY` must preserve newline characters. In `.env`, escape newlines as `\n`. The code already handles newline normalization before initializing admin.
- Ensure your deployment platform allows long string env variables.

Client env exposure is configured in [`next.config.ts`](next.config.ts:7):
```
env: {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.FIREBASE_VAPID_KEY,
}
```

## 4. Code Locations

- Server-side admin initialization:
  - [`admin.ts`](src/lib/firebase/admin.ts)
- Client-side browser initialization and token helpers:
  - [`client.ts`](src/lib/firebase/client.ts)
- Service worker for background notifications:
  - [`firebase-messaging-sw.js`](public/firebase-messaging-sw.js)
- Push subscription API routes:
  - Subscribe: [`route.ts`](src/app/api/notifications/push/subscribe/route.ts)
  - Unsubscribe: [`route.ts`](src/app/api/notifications/push/unsubscribe/route.ts)
- Notification preferences API:
  - [`route.ts`](src/app/api/notifications/preferences/route.ts)
- Notification service:
  - [`notificationService.ts`](src/lib/notifications/notificationService.ts)
- React Hook:
  - [`usePushNotifications.ts`](src/hooks/usePushNotifications.ts)
- UI Prompt:
  - [`PushNotificationPrompt.tsx`](src/components/ui/PushNotificationPrompt.tsx)
- Admin broadcast API and UI:
  - API: [`route.ts`](src/app/api/admin/notifications/broadcast/route.ts)
  - UI: [`page.tsx`](src/app/admin/notifications/page.tsx)
- Background reminder job:
  - [`send-reminders.ts`](scripts/send-reminders.ts)
- NPM script:
  - `cron:send-reminders` added in [`package.json`](package.json:5)

## 5. Database and Prisma

Make sure your Prisma schema includes:

- `PushSubscription` with unique `token` and `userId`, plus device information and indexes
- `NotificationPreference` with user-scoped preferences, denormalized booleans for channel and categories

File:
- [`schema.prisma`](prisma/schema.prisma)

Run:
- `npm run prisma:generate`
- `npm run prisma:migrate`

## 6. Service Worker and Messaging

Web push requires a service worker hosted under your app origin. Quitline places the SW at:
- `public/firebase-messaging-sw.js`

It loads Firebase scripts, initializes messaging in background, and handles `notificationclick`:
- If the payload includes `data.url`, it opens/focuses the page accordingly.
- Foreground messages are handled in the React hook.

Important:
- SW cannot access `process.env` directly. We serve a dynamic config blob via
  - [`route.ts`](src/app/api/firebase/config/route.ts)
  and the SW imports it to initialize Firebase in background safely.

## 7. Permissions and Token Flow

In the browser:
- The `usePushNotifications` hook requests Notification permission on user gesture.
- If granted, it obtains the FCM registration token with VAPID configuration (if provided).
- It sends the token and device metadata to the backend via subscribe API.
- It returns `isSupported`, `isGranted`, and current `token`.

Opt-in UX:
- `PushNotificationPrompt` invites the user to enable push with clear benefits.
- It remembers dismissals and respects session-level prompts.

## 8. Sending Notifications

NotificationService will:
- Persist in-app notification records
- Honor user preferences (`NotificationPreference`)
- Attempt email (using existing email service) depending on priority and channel flags
- Attempt push via Admin SDK with exponential backoff retries
- Clean up invalid tokens (FCM returns error codes after which we delete the token)
- Audit each push attempt in `AuditLog` (channel metadata includes success/invalid/error)

### Trigger Points Included

- Appointments:
  - Creation, status updates, reminders (via cron in next hour)
- Messages:
  - When recipient is offline, notify
- Prescriptions:
  - On creation, patient notified
  - Refill readiness (future background job)
- Investigations:
  - On result creation, patient and provider notified

## 9. Admin Broadcasts and Stats

Admin can broadcast notifications:
- UI: `/admin/notifications`
- API: `POST /api/admin/notifications/broadcast`

Delivery stats (last 24h) are computed from `AuditLog` entries tagged with `channel: 'push'`.

Use this for:
- Smoke tests of FCM
- Monitoring invalid tokens and failures
- Measuring failure rate percentage

## 10. Background Reminders Cron

The reminders script queries appointments starting within the next hour and sends reminders:
- Script: `scripts/send-reminders.ts`
- NPM script: `npm run cron:send-reminders`

Scheduling:
- Vercel Cron (Serverless) or your scheduler (e.g., GitHub Actions with self-hosted runner, Dockerized task, etc.)
- Run every 5–10 minutes
- Ensure idempotency window is acceptable: you may add more safeguards (e.g., store last-reminded flag per appointment) if needed.

## 11. Safari, Chrome, Firefox Considerations

- Chrome, Firefox:
  - Support web push with service workers and Notification permissions
- Safari:
  - Safari supports web push on macOS (and iOS/iPadOS via iOS 16.4+ with PWA installed)
  - Ensure HTTPS origin
  - User must add the app to the home screen for mobile Safari push
  - Behavior may differ; test on Safari thoroughly

General:
- Always require a user gesture for `Notification.requestPermission()`
- Respect denials and provide settings page to re-enable push

## 12. Testing Checklist

1. Set `.env` secrets for Firebase server and client config
2. Build and run app
3. Open Patient or Provider dashboard
4. Accept push prompt
5. Validate token registered:
   - Check DB `PushSubscription` table has a row with `token`, `userId`, and `enabled`
6. Send a test broadcast from Admin Notifications page
7. Trigger message send when recipient is offline to receive push
8. Trigger appointment creation or status change
9. Run `npm run cron:send-reminders` to test reminders (locally in dev terminal)
10. Confirm notifications open relevant pages on click

## 13. Security and Operations

- Do not commit `.env` or service account JSON files
- Rotate service account keys periodically
- Monitor failure rate from Admin Notifications stats
- Clean up invalid tokens automatically (built-in)
- Consider rate limiting or batching for large broadcasts

## 14. Known Limitations / Future Enhancements

- Topic subscriptions are abstracted via `sendTopicNotification`; membership management not implemented (can be added later).
- Prescription refill readiness background job needs implementation.
- More granular preference granularity could be added per priority level.
- Safari mobile push requires PWA install; consider instructing users accordingly.

## 15. References

- Firebase Cloud Messaging (Web): https://firebase.google.com/docs/cloud-messaging/js/first-message
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Vercel Cron: https://vercel.com/docs/cron-jobs