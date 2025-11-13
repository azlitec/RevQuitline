import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * NextAuth.js API Route Handler for Next.js 15 App Router
 * 
 * This configuration handles all authentication requests and prevents
 * 405 Method Not Allowed errors by explicitly handling all HTTP methods.
 * 
 * Supported methods:
 * - GET: Session checks, CSRF token, providers list, callbacks
 * - POST: Sign in, sign out, callback handling
 * - HEAD: Health checks (returns 200)
 * - OPTIONS: CORS preflight (returns 200)
 * 
 * @see https://next-auth.js.org/configuration/initialization#route-handlers-app
 * @see https://github.com/nextauthjs/next-auth/issues/9180
 */
const handler = NextAuth(authOptions)

// Export handler for GET and POST (main authentication methods)
export { handler as GET, handler as POST }

/**
 * Handle HEAD requests (health checks)
 * Returns 200 OK to prevent 405 errors
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}

/**
 * Handle OPTIONS requests (CORS preflight)
 * Returns 200 OK with appropriate CORS headers
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}