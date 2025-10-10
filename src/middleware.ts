import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // List of public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/about',
    '/contact',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/csrf',
    // Adding auth routes explicitly as public paths
    '/admin-auth/login',
    '/admin-auth/register',
    '/clerk-auth/login',
    '/clerk-auth/register'
  ];

  // Check if the current path is a public path (more specific check)
  const isPublicPath = publicPaths.includes(path) || 
    path.startsWith('/api/auth/') ||
    path.includes('_next') || 
    path.includes('/static/');

  // Get the token, if it exists
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Public paths should always be accessible without redirects
  if (isPublicPath) {
    // For auth pages, check if already logged in and redirect to appropriate dashboard if true
    if (token) {
      if ((path === '/admin-auth/login' || path === '/admin-auth/register') && token.isAdmin) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      
      if ((path === '/clerk-auth/login' || path === '/clerk-auth/register') && 
          (token.isClerk || token.isAdmin)) {
        return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
      }
      
      if (path === '/login' || path === '/register') {
        // Redirect to appropriate dashboard based on user role
        const role = (token.role as string) || undefined;
        let dashboardPath = '/patient/dashboard';
        if (token.isAdmin) {
          dashboardPath = '/admin/dashboard';
        } else if (token.isClerk) {
          dashboardPath = '/clerk/dashboard';
        } else if (token.isProvider || role === 'PROVIDER' || role === 'PROVIDER_PENDING' || role === 'PROVIDER_REVIEWING') {
          // Approved providers and pending/reviewing providers go to provider dashboard (preview for pending/reviewing)
          dashboardPath = '/provider/dashboard';
        }
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }
    
    // For all other public paths, just continue
    return NextResponse.next();
  }

  // At this point, we're dealing with protected routes
  // Redirect to login if accessing a protected route without being authenticated
  if (!token) {
    // Determine the appropriate login page based on the path
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

  // Special protected routes that require specific roles

  // Admin route protection
  if (path.startsWith('/admin')) {
    const isAdmin = token?.role === 'ADMIN' || token?.isAdmin === true;
    if (!isAdmin) {
      // User is authenticated but not an admin, redirect to appropriate dashboard
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
      // User is authenticated but not a clerk or admin, redirect to appropriate dashboard
      let dashboardPath = '/patient/dashboard';
      const role = (token.role as string) || undefined;
      if (token.isProvider || role === 'PROVIDER' || role === 'PROVIDER_PENDING' || role === 'PROVIDER_REVIEWING') {
        dashboardPath = '/provider/dashboard';
      }
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  // Provider route protection with staged approval access
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

    // Full access for approved providers and privileged roles
    if (isApprovedProvider || isPrivileged) {
      // allow through
    } else if (isPendingProvider) {
      // Pending providers may only access provider dashboard (preview)
      const allowedPaths = ['/provider', '/provider/', '/provider/dashboard'];
      const isAllowed =
        allowedPaths.includes(path) ||
        path.startsWith('/provider/dashboard');

      if (!isAllowed) {
        // Restrict functional pages until approval
        return NextResponse.redirect(new URL('/provider/dashboard', request.url));
      }
    } else {
      // Not a provider, clerk, or admin -> redirect to appropriate dashboard
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
    // Match all paths except for static assets and API routes that don't need protection
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};