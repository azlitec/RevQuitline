import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Simple public paths
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/about',
  '/contact'
];

// Admin auth paths (separate from regular auth)
const adminAuthPaths = [
  '/admin-auth/login',
  '/admin-auth/register'
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow NextAuth API routes
  if (path.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Allow static files
  if (path.includes('_next') || path.includes('/static/') || path.includes('favicon')) {
    return NextResponse.next();
  }

  // Allow API routes (they handle their own auth)
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if path is public or admin auth
  const isPublicPath = publicPaths.includes(path);
  const isAdminAuthPath = adminAuthPaths.includes(path);

  // Allow admin auth paths without token check
  if (isAdminAuthPath) {
    return NextResponse.next();
  }

  // Get token for protected routes
  // Critical: Use proper cookie name based on environment
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://'),
    cookieName: process.env.NEXTAUTH_URL?.startsWith('https://')
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
  });

  // Public paths - redirect if already logged in
  if (isPublicPath) {
    if (token && (path === '/login' || path === '/register')) {
      // Simple redirect based on role
      if (token.isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (token.role === 'PROVIDER_PENDING') {
        return NextResponse.redirect(new URL('/provider/pending', request.url));
      } else if (token.isProvider) {
        return NextResponse.redirect(new URL('/provider/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/patient/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(url);
  }

  // Simple role-based protection
  if (path.startsWith('/admin') && !token.isAdmin) {
    return NextResponse.redirect(new URL('/patient/dashboard', request.url));
  }

  // Provider routes handling
  if (path.startsWith('/provider')) {
    // Allow pending providers to access /provider/pending only
    if (token.role === 'PROVIDER_PENDING') {
      if (path !== '/provider/pending') {
        return NextResponse.redirect(new URL('/provider/pending', request.url));
      }
    }
    // Allow approved providers and admins to access all provider routes
    else if (!token.isProvider && !token.isAdmin) {
      return NextResponse.redirect(new URL('/patient/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
