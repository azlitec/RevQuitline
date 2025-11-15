import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public paths that don't require authentication
const publicPaths = ['/', '/login', '/register', '/about', '/contact'];

// Admin auth paths
const adminAuthPaths = ['/admin-auth/login', '/admin-auth/register'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast path checks (no async operations)
  // Allow NextAuth API routes, static files, and API routes
  if (
    path.startsWith('/api/auth/') ||
    path.includes('_next') ||
    path.includes('/static/') ||
    path.includes('favicon') ||
    path.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Check if path is public or admin auth
  const isPublicPath = publicPaths.includes(path);
  const isAdminAuthPath = adminAuthPaths.includes(path);

  // Allow admin auth paths without token check
  if (isAdminAuthPath) {
    return NextResponse.next();
  }

  // Get token (only async operation in middleware)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Public paths - redirect if already logged in
  if (isPublicPath) {
    if (token && (path === '/login' || path === '/register')) {
      // Determine dashboard based on role
      const dashboardPath = token.isAdmin 
        ? '/admin/dashboard'
        : token.role === 'PROVIDER_PENDING'
        ? '/provider/pending'
        : token.isProvider
        ? '/provider/dashboard'
        : '/patient/dashboard';
      
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(url);
  }

  // Role-based protection
  if (path.startsWith('/admin') && !token.isAdmin) {
    return NextResponse.redirect(new URL('/patient/dashboard', request.url));
  }

  // Provider routes handling
  if (path.startsWith('/provider')) {
    if (token.role === 'PROVIDER_PENDING' && path !== '/provider/pending') {
      return NextResponse.redirect(new URL('/provider/pending', request.url));
    }
    if (!token.isProvider && !token.isAdmin) {
      return NextResponse.redirect(new URL('/patient/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
  runtime: 'experimental-edge', // Use experimental-edge runtime for optimal performance
};
