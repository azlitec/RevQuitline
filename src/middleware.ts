import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { verifyCsrfToken, isStateChanging } from '@/lib/security/csrf';

// Cache public paths as Set for O(1) lookup performance
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/about',
  '/contact',
  '/admin-auth/login',
  '/admin-auth/register',
  '/clerk-auth/login',
  '/clerk-auth/register'
]);

// Cache static path patterns for faster matching
const STATIC_PATH_PATTERNS = ['_next', '/static/', '/favicon.ico', '/robots.txt', '/sitemap.xml'];

// Role-based dashboard mapping for faster redirects
const ROLE_DASHBOARDS = {
  ADMIN: '/admin/dashboard',
  CLERK: '/clerk/dashboard',
  PROVIDER: '/provider/dashboard',
  PROVIDER_PENDING: '/provider/dashboard',
  PROVIDER_REVIEWING: '/provider/dashboard',
  USER: '/patient/dashboard'
} as const;

function isStaticPath(path: string): boolean {
  return STATIC_PATH_PATTERNS.some(pattern => path.includes(pattern));
}

function getUserRole(token: any): string {
  if (token?.isAdmin || token?.role === 'ADMIN') return 'ADMIN';
  if (token?.isClerk || token?.role === 'CLERK') return 'CLERK';
  if (token?.isProvider || token?.role === 'PROVIDER') return 'PROVIDER';
  if (token?.role === 'PROVIDER_PENDING') return 'PROVIDER_PENDING';
  if (token?.role === 'PROVIDER_REVIEWING') return 'PROVIDER_REVIEWING';
  return 'USER';
}

function getDashboardPath(userRole: string): string {
  return ROLE_DASHBOARDS[userRole as keyof typeof ROLE_DASHBOARDS] || '/patient/dashboard';
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Early returns for performance - skip auth for static assets and NextAuth routes
  if (path.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Fast static asset bypass
  if (isStaticPath(path)) {
    return NextResponse.next();
  }

  // Fast API route handling with optimized CSRF check
  if (path.startsWith('/api/') && path !== '/api/auth/signout') {
    if (isStateChanging(request) && !verifyCsrfToken(request)) {
      return NextResponse.json({ 
        error: 'CSRF validation failed',
        code: 'CSRF_INVALID' 
      }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Check if path is public using Set for O(1) lookup
  const isPublicPath = PUBLIC_PATHS.has(path);

  // Only get token if we need it (not for static or public paths without auth logic)
  let token = null;
  if (!isPublicPath || (isPublicPath && (path === '/login' || path === '/register' || path.includes('auth')))) {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development",
    });
  }

  // Optimized public path handling
  if (isPublicPath) {
    // Smart redirect for authenticated users trying to access auth pages
    if (token) {
      const userRole = getUserRole(token);
      const dashboardPath = getDashboardPath(userRole);
      
      // Specific auth page redirects
      if (path === '/admin-auth/login' || path === '/admin-auth/register') {
        if (userRole === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
      
      if (path === '/clerk-auth/login' || path === '/clerk-auth/register') {
        if (userRole === 'CLERK' || userRole === 'ADMIN') {
          return NextResponse.redirect(new URL('/clerk/dashboard', request.url));
        }
      }
      
      // General login/register redirect
      if (path === '/login' || path === '/register') {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }
    
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    // Smart login path selection
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

  // Optimized role-based route protection
  const userRole = getUserRole(token);
  
  // Admin route protection
  if (path.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      const dashboardPath = getDashboardPath(userRole);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }
  
  // Clerk route protection - allow admin and clerk access
  else if (path.startsWith('/clerk')) {
    if (userRole !== 'CLERK' && userRole !== 'ADMIN') {
      const dashboardPath = getDashboardPath(userRole);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }
  
  // Provider route protection with pending provider handling
  else if (path.startsWith('/provider')) {
    const isProviderRole = ['PROVIDER', 'PROVIDER_PENDING', 'PROVIDER_REVIEWING'].includes(userRole);
    const isPrivileged = ['ADMIN', 'CLERK'].includes(userRole);
    
    if (!isProviderRole && !isPrivileged) {
      const dashboardPath = getDashboardPath(userRole);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    
    // Restrict pending providers to dashboard only
    if (userRole === 'PROVIDER_PENDING' || userRole === 'PROVIDER_REVIEWING') {
      const allowedPaths = ['/provider', '/provider/', '/provider/dashboard'];
      const isAllowed = allowedPaths.includes(path) || path.startsWith('/provider/dashboard');
      
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/provider/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
