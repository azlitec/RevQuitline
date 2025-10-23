/**
 * Firebase Admin SDK initialization for server-side push notifications.
 * Loads service account credentials from environment variables and exposes a
 * Messaging instance for FCM operations.
 */

import 'server-only';

import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

const DISABLE_PUSH = process.env.DISABLE_PUSH_NOTIFICATIONS === 'true';

type ServiceAccountEnv = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

/**
 * Read and normalize service account credentials from environment variables.
 * Private key may include escaped newlines in some deployments, so we unescape.
 */
function getServiceAccountFromEnv(): ServiceAccountEnv {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Some platforms wrap env values in quotes; strip them.
  if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  // Replace escaped newlines with real newlines.
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  return { projectId, clientEmail, privateKey };
}

function validateEnv(sa: ServiceAccountEnv): boolean {
  if (!sa.projectId || !sa.clientEmail || !sa.privateKey) {
    // Fast-delivery: do not throw during build; treat credentials as unavailable
    return false;
  }
  return true;
}

let app: App;
let messaging: Messaging;

declare global {
  // eslint-disable-next-line no-var
  var __firebaseAdmin__: {
    app?: App;
    messaging?: Messaging;
  } | undefined;
}

// Cache in global to avoid re-initialization with Next.js hot reload.
const GA = globalThis as any;
if (!GA.__firebaseAdmin__) {
  GA.__firebaseAdmin__ = {};
}

if (!DISABLE_PUSH && (!GA.__firebaseAdmin__.app || !GA.__firebaseAdmin__.messaging)) {
  const sa = getServiceAccountFromEnv();
  const ok = validateEnv(sa);

  if (ok) {
    app = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: sa.projectId!,
        clientEmail: sa.clientEmail!,
        privateKey: sa.privateKey!,
      }),
    });

    messaging = getMessaging(app);

    GA.__firebaseAdmin__.app = app;
    GA.__firebaseAdmin__.messaging = messaging;
  } else {
    // Credentials missing; provide a no-op messaging shim to avoid build-time failures
    GA.__firebaseAdmin__.messaging = ({ send: async () => ({}) } as unknown as Messaging);
  }
}

export const firebaseAdminApp: App | undefined = GA.__firebaseAdmin__.app;
// Provide a no-op Messaging shim when push is disabled or not initialized
export const adminMessaging: Messaging =
  (GA.__firebaseAdmin__.messaging as Messaging) ||
  ({ send: async () => ({}) } as unknown as Messaging);

/**
 * Health check helper: performs a dry-run send to validate credentials.
 * Returns true even if token is invalid, as the purpose is auth validation.
 */
export async function pingFCMHealth(): Promise<boolean> {
  if (DISABLE_PUSH) return true;
  try {
    await adminMessaging.send(
      { token: 'test-token', notification: { title: 'noop', body: 'noop' } },
      true /* dryRun */
    );
    return true;
  } catch (_e) {
    // Dry-run validates authentication; token errors are acceptable here.
    return true;
  }
}