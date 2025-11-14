import { NextRequest, NextResponse } from 'next/server';

/**
 * NextAuth Internal Logging Endpoint Handler
 * 
 * This endpoint is used by NextAuth v4 for client-side error reporting.
 * It's an internal endpoint that needs explicit handling in Next.js 15 App Router
 * to prevent 405 "Method Not Allowed" errors.
 * 
 * Background:
 * - NextAuth v4 has an internal `/_log` endpoint for error reporting
 * - In Next.js 15 App Router, catch-all routes don't automatically handle this
 * - We need to explicitly define handlers for all HTTP methods
 * 
 * Solution:
 * - Accept POST requests (main method used by NextAuth client)
 * - Accept GET, HEAD, OPTIONS for completeness
 * - Log errors in development for debugging
 * - Return 200 OK to acknowledge receipt
 * 
 * @see https://github.com/nextauthjs/next-auth/issues/9180
 * @see https://github.com/nextauthjs/next-auth/issues/8283
 */

/**
 * Handle POST requests from NextAuth client-side error logging
 */
export async function POST(request: NextRequest) {
  // Only log in development to avoid cluttering production logs
  if (process.env.NODE_ENV === 'development') {
    try {
      const body = await request.json();
      console.log('[NextAuth _log] Client error:', {
        ...body,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Ignore JSON parsing errors
      console.log('[NextAuth _log] Received non-JSON request');
    }
  }
  
  // Always return 200 to acknowledge receipt
  return new NextResponse(null, { status: 200 });
}

/**
 * Handle GET requests (health checks, monitoring)
 */
export async function GET(request: NextRequest) {
  return new NextResponse(
    JSON.stringify({ 
      status: 'ok',
      endpoint: '/_log',
      message: 'NextAuth logging endpoint'
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle HEAD requests (health checks)
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
