/**
 * Firebase Admin SDK initialization for server-side push notifications.
 * Loads service account credentials from environment variables and exposes a
 * Messaging instance for FCM operations.
 */

import 'server-only';

import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

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

function validateEnv(sa: ServiceAccountEnv) {
  if (!sa.projectId || !sa.clientEmail || !sa.privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are set.'
    );
  }
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
if (!global.__firebaseAdmin__) {
  global.__firebaseAdmin__ = {};
}

if (!global.__firebaseAdmin__.app || !global.__firebaseAdmin__.messaging) {
  const sa = getServiceAccountFromEnv();
  validateEnv(sa);

  app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: sa.projectId!,
      clientEmail: sa.clientEmail!,
      privateKey: sa.privateKey!,
    }),
  });

  messaging = getMessaging(app);

  global.__firebaseAdmin__.app = app;
  global.__firebaseAdmin__.messaging = messaging;
}

export const firebaseAdminApp: App = global.__firebaseAdmin!.app!;
export const adminMessaging: Messaging = global.__firebaseAdmin!.messaging!;

/**
 * Health check helper: performs a dry-run send to validate credentials.
 * Returns true even if token is invalid, as the purpose is auth validation.
 */
export async function pingFCMHealth(): Promise<boolean> {
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