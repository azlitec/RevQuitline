# Design Document: Vercel Hobby Plan Login Optimization

## Overview

This design addresses login failures on Vercel's Hobby (Free) plan by optimizing database connections, NextAuth configuration, middleware execution, and deployment settings. The solution focuses on serverless-friendly patterns that work within Vercel's constraints: 10-second function timeout, limited concurrent executions, and edge runtime compatibility.

## Architecture

### High-Level Architecture

```
User Request → Vercel Edge (Middleware) → Serverless Function → Database
                     ↓                            ↓
              JWT Validation              NextAuth + Prisma
                     ↓                            ↓
              Route Protection           Connection Pool (1 conn)
```

### Key Components

1. **Database Connection Layer** - Optimized Prisma client with connection pooling
2. **Authentication Layer** - NextAuth with JWT strategy
3. **Middleware Layer** - Lightweight edge runtime middleware
4. **Environment Configuration** - Validated environment variables
5. **Deployment Configuration** - Vercel-specific settings

## Components and Interfaces

### 1. Database Connection Layer

**File:** `src/lib/db/index.ts`

**Purpose:** Provide a singleton Prisma client optimized for serverless environments

**Implementation:**

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern for serverless
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection lifecycle management
export async function disconnectDB() {
  await prisma.$disconnect();
}
```

**Key Features:**
- Singleton pattern prevents multiple instances
- Minimal logging in production
- Explicit connection URL from environment
- Graceful disconnect function

### 2. NextAuth Configuration

**File:** `src/lib/auth/auth.ts`

**Changes Required:**

1. **Add connection timeout handling:**
```typescript
async authorize(credentials) {
  // Set timeout for database operations
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Authentication timeout')), 8000)
  );
  
  const authPromise = async () => {
    // existing auth logic
  };
  
  return Promise.race([authPromise(), timeoutPromise]);
}
```

2. **Improve error handling:**
```typescript
catch (error: any) {
  if (error.message === 'Authentication timeout') {
    console.error('[Auth] Timeout during authentication');
    throw new Error('Authentication service is temporarily unavailable');
  }
  // existing error handling
}
```

3. **Optimize session strategy:**
```typescript
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30)
  updateAge: 24 * 60 * 60, // Update session every 24 hours
}
```

### 3. Middleware Optimization

**File:** `src/middleware.ts`

**Changes Required:**

1. **Add Edge Runtime export:**
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
  runtime: 'edge', // Explicitly use edge runtime
};
```

2. **Simplify token validation:**
```typescript
// Remove complex logic, keep it minimal
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Quick path checks (no async operations)
  if (
    path.startsWith('/api/auth/') ||
    path.includes('_next') ||
    path.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.includes(path);

  // Get token (only async operation)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Simple redirect logic
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && (path === '/login' || path === '/register')) {
    const dashboardPath = token.isAdmin ? '/admin/dashboard' 
      : token.isProvider ? '/provider/dashboard' 
      : '/patient/dashboard';
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  return NextResponse.next();
}
```

### 4. Environment Variable Validation

**File:** `src/lib/config/env.ts` (new file)

**Purpose:** Validate critical environment variables at startup

```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or Vercel environment variables.'
    );
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL!;
  if (!dbUrl.includes('pgbouncer=true')) {
    console.warn('[Config] DATABASE_URL should include pgbouncer=true for optimal performance');
  }
  if (!dbUrl.includes(':6543')) {
    console.warn('[Config] DATABASE_URL should use port 6543 for Supabase connection pooling');
  }

  // Validate NEXTAUTH_SECRET length
  if (process.env.NEXTAUTH_SECRET!.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters long');
  }

  console.log('[Config] Environment validation passed');
}
```

**Integration:** Call `validateEnv()` in `src/app/layout.tsx` or API route initialization

### 5. Vercel Configuration

**File:** `vercel.json`

**Purpose:** Configure Vercel deployment settings for Hobby plan

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "framework": "nextjs",
  "regions": ["sin1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Key Settings:**
- `maxDuration: 10` - Hobby plan limit
- `memory: 1024` - Optimal for Hobby plan
- `regions: ["sin1"]` - Singapore region (closest to Supabase)
- Build command includes Prisma setup

### 6. Updated .env.example

**File:** `.env.example`

**Purpose:** Provide clear template for environment variables

```bash
# Database Configuration
# CRITICAL: Use port 6543 with pgbouncer for Vercel
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# NextAuth Configuration
# For Vercel: Set to your exact deployment URL
NEXTAUTH_URL="https://your-app.vercel.app"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here-min-32-chars"

# Application Environment
NODE_ENV="production"
```

## Data Models

No changes to existing Prisma schema required. The optimization focuses on connection management, not data structure.

## Error Handling

### Authentication Errors

1. **Database Connection Timeout**
   - Error: "Authentication service is temporarily unavailable"
   - Log: Connection timeout details
   - User Action: Retry login

2. **Invalid Credentials**
   - Error: "Invalid email or password"
   - Log: Failed login attempt (email only, no password)
   - User Action: Check credentials

3. **Database Connection Pool Exhausted**
   - Error: "Service temporarily unavailable"
   - Log: Connection pool status
   - User Action: Wait and retry

### Middleware Errors

1. **Token Validation Failure**
   - Action: Redirect to login
   - Log: Token validation error
   - No user-facing error (silent redirect)

2. **Edge Runtime Error**
   - Action: Allow request through (fail open)
   - Log: Middleware error details
   - Alert: Monitor for repeated failures

## Testing Strategy

### Unit Tests

1. **Database Connection Tests**
   - Test singleton pattern
   - Test connection timeout
   - Test connection reuse

2. **NextAuth Configuration Tests**
   - Test JWT generation
   - Test session callbacks
   - Test timeout handling

3. **Environment Validation Tests**
   - Test missing variables
   - Test invalid formats
   - Test validation success

### Integration Tests

1. **Login Flow Test**
   - Test successful login
   - Test failed login
   - Test session creation
   - Test redirect after login

2. **Middleware Test**
   - Test public route access
   - Test protected route access
   - Test role-based redirects

### Manual Testing on Vercel

1. **Deploy to Vercel Preview**
   - Verify environment variables
   - Test login functionality
   - Check function execution time
   - Monitor error logs

2. **Production Deployment**
   - Test login from multiple locations
   - Verify session persistence
   - Monitor database connections
   - Check error rates

## Performance Considerations

### Database Connections

- **Target:** < 5 connections total across all functions
- **Strategy:** Single connection per function instance
- **Monitoring:** Log connection pool status

### Function Execution Time

- **Target:** < 3 seconds for login
- **Strategy:** Timeout at 8 seconds (buffer for 10s limit)
- **Monitoring:** Log execution time for auth operations

### Cold Start Optimization

- **Prisma Client:** Pre-generated during build
- **Middleware:** Minimal logic, edge runtime
- **Session:** JWT (no database lookup)

## Security Considerations

1. **NEXTAUTH_SECRET:** Must be cryptographically secure, minimum 32 characters
2. **Database URL:** Should not be logged or exposed in error messages
3. **Password Hashing:** Continue using bcryptjs with appropriate rounds
4. **Session Tokens:** JWT with 7-day expiry, httpOnly cookies
5. **Error Messages:** Generic messages to users, detailed logs for developers

## Deployment Checklist

### Vercel Environment Variables

1. Set `DATABASE_URL` with correct format (port 6543, pgbouncer=true)
2. Set `NEXTAUTH_URL` to exact Vercel deployment URL
3. Generate and set `NEXTAUTH_SECRET` (openssl rand -base64 32)
4. Set `NODE_ENV=production`

### Vercel Project Settings

1. Framework Preset: Next.js
2. Build Command: `prisma generate && prisma migrate deploy && next build`
3. Output Directory: `.next`
4. Install Command: `npm install`
5. Region: Singapore (sin1) - closest to Supabase

### Post-Deployment Verification

1. Test login with valid credentials
2. Test login with invalid credentials
3. Verify session persistence across page loads
4. Check Vercel function logs for errors
5. Monitor database connection count in Supabase dashboard

## Rollback Plan

If issues persist after deployment:

1. **Immediate:** Revert to previous Vercel deployment
2. **Investigate:** Check Vercel function logs and Supabase connection logs
3. **Adjust:** Modify connection limits or timeout values
4. **Redeploy:** Test in preview environment before production

## Monitoring and Maintenance

### Key Metrics to Monitor

1. Login success rate
2. Function execution time
3. Database connection count
4. Error rate by type
5. Cold start frequency

### Alerts to Configure

1. Login failure rate > 10%
2. Function timeout rate > 5%
3. Database connection errors
4. Middleware errors

### Regular Maintenance

1. Review error logs weekly
2. Monitor Vercel usage against Hobby plan limits
3. Update dependencies monthly
4. Review and rotate NEXTAUTH_SECRET quarterly
