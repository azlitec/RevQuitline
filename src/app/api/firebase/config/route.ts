import { NextResponse } from 'next/server';

/**
 * Returns a JS snippet that assigns Firebase public config into the SW global scope:
 *   self.__FIREBASE_CONFIG__ = { ... };
 *
 * The service worker imports this endpoint via:
 *   importScripts('/api/firebase/config');
 *
 * This avoids embedding envs directly in the static SW file.
 */
export async function GET() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || null,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || null,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || null,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || null,
  };

  // Only include config if we have the essential keys
  const hasEssentialConfig = cfg.apiKey && cfg.projectId && cfg.messagingSenderId;
  const finalConfig = hasEssentialConfig ? cfg : null;

  const js = `self.__FIREBASE_CONFIG__ = ${JSON.stringify(finalConfig)};`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}