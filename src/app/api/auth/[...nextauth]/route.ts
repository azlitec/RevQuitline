import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth/auth"

/**
 * NextAuth.js API Route Handler
 * 
 * Handles all authentication requests including:
 * - GET: Session checks, CSRF token, providers list
 * - POST: Sign in, sign out, callback handling
 * 
 * @see https://next-auth.js.org/configuration/initialization#route-handlers-app
 */
const handler = NextAuth(authOptions)

// Export handler for both GET and POST methods
export { handler as GET, handler as POST }