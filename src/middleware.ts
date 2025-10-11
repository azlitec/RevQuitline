import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  console.log('[Middleware] Path:', path);

  // Always allow NextAuth API routes (signin, signout, session, etc.)
  if (path.startsWith('/api/auth/')) {
    console.log('[Middleware] NextAuth API route - allowing');
    return NextResponse.next();
  }

  // Allow other API routes (but they should have their own auth checks)
  // EXCEPT for signout route which needs proper session handling
  if (path.startsWith('/api/') && path !== '/api/auth/signout') {
    return NextResponse.next();
  }

  // List of public paths
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/about',
    '/contact',
    '/admin-auth/login',
    '/admin-auth/register',
    '/clerk-auth/login',
    '/clerk-auth/register'
  ];

  // Check if path is public or static
  const isPublicPath = publicPaths.includes(path) || 
    path.includes('_next') || 
    path.includes('/static/');

  // Get token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development",
  });

  console.log('[Middleware] Token exists:', !!token);
  console.log('[Middleware] Token role:', token?.role);
  console.log('[Middleware] Is admin:', token?.isAdmin);

  // Public paths handling
  if (isPublicPath) {
    // If user is logged in and trying to access login pages, redirect to dashboard
    if (token) {
      if ((path === '/admin-auth/login' || path === '/admin-auth/register') && token.isAdmin) {
        console.log('[Middleware] Admin already logged in - redirect to admin dashboard');
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      
      if ((path === '/clerk-auth/login' || path === '/clerk-auth/register') && 
          (token.isClerk || token.isAdmin)) {
        return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
      }
      
      if (path === '/login' || path === '/register') {
        const role = (token.role as string) || undefined;
        let dashboardPath = '/patient/dashboard';
        if (token.isAdmin) {
          dashboardPath = '/admin/dashboard';
        } else if (token.isClerk) {
          dashboardPath = '/clerk/dashboard';
        } else if (token.isProvider || role === 'PROVIDER' || role === 'PROVIDER_PENDING' || role === 'PROVIDER_REVIEWING') {
          dashboardPath = '/provider/dashboard';
        }
        console.log('[Middleware] User already logged in - redirect to:', dashboardPath);
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }
    
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    console.log('[Middleware] No token - redirect to login');
    
    let loginPath = '/login';
    if (path.startsWith('/admin')) {
      loginPath = '/admin-auth/login';
    } else if (path.startsWith('/clerk')) {
      loginPath = '/clerk-auth/login';
    }
    
    const url = new URL(loginPath, request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Admin route protection
  if (path.startsWith('/admin')) {
    const isAdmin = token?.role === 'ADMIN' || token?.isAdmin === true;
    if (!isAdmin) {
      console.log('[Middleware] Not admin - redirect to appropriate dashboard');
      let dashboardPath = '/patient/dashboard';
      const role = (token.role as string) || undefined;
      if (token.isClerk) {
        dashboardPath = '/clerk/dashboard';
      } else if (token.isProvider || role === 'PROVIDER' || role === 'PROVIDER_PENDING' || role === 'PROVIDER_REVIEWING') {
        dashboardPath = '/provider/dashboard';
      }
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  // Clerk route protection
  if (path.startsWith('/clerk')) {
    const isClerkOrAdmin =
      token?.role === 'CLERK' ||
      token?.role === 'ADMIN' ||
      token?.isClerk === true ||
      token?.isAdmin === true;

    if (!isClerkOrAdmin) {
      let dashboardPath = '/patient/dashboard';
      const role = (token.role as string) || undefined;
      if (token.isProvider || role === 'PROVIDER' || role === 'PROVIDER_PENDING' || role === 'PROVIDER_REVIEWING') {
        dashboardPath = '/provider/dashboard';
      }
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  // Provider route protection
  if (path.startsWith('/provider')) {
    const role = (token?.role as string) || undefined;

    const isPrivileged =
      role === 'CLERK' ||
      role === 'ADMIN' ||
      token?.isClerk === true ||
      token?.isAdmin === true;

    const isApprovedProvider =
      role === 'PROVIDER' ||
      token?.isProvider === true;

    const isPendingProvider =
      role === 'PROVIDER_PENDING' ||
      role === 'PROVIDER_REVIEWING';

    if (isApprovedProvider || isPrivileged) {
      // Allow through
    } else if (isPendingProvider) {
      const allowedPaths = ['/provider', '/provider/', '/provider/dashboard'];
      const isAllowed =
        allowedPaths.includes(path) ||
        path.startsWith('/provider/dashboard');

      if (!isAllowed) {
        return NextResponse.redirect(new URL('/provider/dashboard', request.url));
      }
    } else {
      let dashboardPath = '/patient/dashboard';
      if (token?.isClerk) {
        dashboardPath = '/clerk/dashboard';
      } else if (token?.isAdmin) {
        dashboardPath = '/admin/dashboard';
      }
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
